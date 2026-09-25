<?php
/**
 * @var array    $attributes Block attributes array.
 * @var WP_Block $block      WP_Block instance being rendered.
 */

if ( empty( $attributes['taxonomy'] ) ) {
	return;
}

$taxonomy = get_taxonomy( $attributes['taxonomy'] );

// The saved taxonomy may since have been unregistered or made private. The
// query string filter is discarded server side in either case, so rendering
// the control would only offer a filter that silently does nothing.
if ( ! $taxonomy || ! is_taxonomy_viewable( $taxonomy ) ) {
	return;
}

$id = 'query-filter-' . wp_generate_uuid4();
$display_type = $attributes['displayType'] ?? 'select';
$layout_direction = $attributes['layoutDirection'] ?? 'vertical';
$hierarchy = \HM\Query_Loop_Filter\get_hierarchy_mode( $attributes, $taxonomy->name );

if ( empty( $block->context['query']['inherit'] ) ) {
	$query_id = $block->context['queryId'] ?? 0;
	$query_var = sprintf( 'query-%d-%s', $query_id, $attributes['taxonomy'] );
	$page_var = isset( $block->context['queryId'] ) ? 'query-' . $block->context['queryId'] . '-page' : 'query-page';
	$base_url = remove_query_arg( [ $query_var, $page_var ] );
} else {
	$query_var = sprintf( 'query-%s', $attributes['taxonomy'] );
	$page_var = 'page';
	$base_url = str_replace( '/page/' . get_query_var( 'paged' ), '', remove_query_arg( [ $query_var, $page_var ] ) );
}

$terms = \HM\Query_Loop_Filter\get_filter_terms( $attributes );

if ( empty( $terms ) ) {
	return;
}

// Non-ASCII term slugs are stored URL-encoded (e.g. "%e6%97%a5"), but arrive from $_GET
// predecoded to raw UTF-8. Normalize the current filter value to the same form used in
// pre_get_posts_transpose_query_vars() to compare directly against urldecode($term->slug).
// phpcs:ignore HM.Security.ValidatedSanitizedInput.InputNotSanitized -- Sniff can't perceive the sanitize_text_field() outside the urldecode().
$current_value = sanitize_text_field( urldecode( wp_unslash( $_GET[ $query_var ] ?? '' ) ) );

$selected_terms = wp_parse_list( $current_value );

// Counts are taken within the current query, only when something here uses them.
$show_count = ! empty( $attributes['showCount'] );
$counts = $show_count || ! empty( $attributes['hideEmpty'] )
	? \HM\Query_Loop_Filter\get_filter_term_counts( $block, $taxonomy->name )
	: null;

// A term with nothing to show in the current query is left out, unless the visitor has
// selected it, so the control can always undo its own state. Counts include descendants,
// so a parent stays whenever any of its children does.
// Without counts for the query, the stored term counts stand in, as they would have had
// the terms been fetched without their empty ones.
if ( ! empty( $attributes['hideEmpty'] ) ) {
	$has_results = is_array( $counts )
		? fn ( WP_Term $term ) => ( $counts[ $term->term_id ] ?? 0 ) > 0
		: fn ( WP_Term $term ) => $term->count > 0;

	$terms = array_values( array_filter(
		$terms,
		fn ( WP_Term $term ) => $has_results( $term ) || in_array( urldecode( $term->slug ), $selected_terms, true )
	) );

	if ( empty( $terms ) ) {
		return;
	}
}

/**
 * Return a term's label, with its count in the current query when counts are shown.
 *
 * @param WP_Term $term Term to label.
 * @param bool    $html Whether markup may wrap the count; an <option> takes text only.
 * @return string Escaped label.
 */
$term_label = function ( WP_Term $term, bool $html = true ) use ( $counts, $show_count ) : string {
	$label = esc_html( $term->name );

	if ( ! $show_count || ! is_array( $counts ) ) {
		return $label;
	}

	$count = (int) ( $counts[ $term->term_id ] ?? 0 );

	return $html
		? sprintf( '%s <span class="wp-block-query-filter__count">(%s)</span>', $label, esc_html( number_format_i18n( $count ) ) )
		: sprintf( '%s (%s)', $label, esc_html( number_format_i18n( $count ) ) );
};

// In a hierarchy the "terms" the overflow cap and the toggle act on are the
// top level branches; a child always travels with its parent.
$tree = $hierarchy === 'flat'
	? array_map( fn ( WP_Term $term ) => [ 'term' => $term, 'children' => [] ], $terms )
	: \HM\Query_Loop_Filter\build_term_tree( $terms );

// Terms past the cap are collapsed behind a "show all" toggle. A term the visitor has
// already selected is always visible, so the control never hides its own active state.
$max_visible = (int) ( $attributes['maxVisibleTerms'] ?? 0 );
$has_overflow = $max_visible > 0 && count( $tree ) > $max_visible;
$show_all_label = $attributes['showAllLabel'] ?: __( 'See all', 'query-filter' );

/**
 * Return whether a term is part of the current selection.
 *
 * @param WP_Term $term Term to test.
 * @return bool True when the term is selected.
 */
$is_selected = function ( WP_Term $term ) use ( $selected_terms ) : bool {
	return in_array( urldecode( $term->slug ), $selected_terms, true );
};

/**
 * Return whether a branch, or anything beneath it, is part of the current selection.
 *
 * @param array $node Tree node.
 * @return bool True when the node or a descendant is selected.
 */
$branch_has_selection = function ( array $node ) use ( &$branch_has_selection, $is_selected ) : bool {
	if ( $is_selected( $node['term'] ) ) {
		return true;
	}

	foreach ( $node['children'] as $child ) {
		if ( $branch_has_selection( $child ) ) {
			return true;
		}
	}

	return false;
};

/**
 * Return whether a top level branch should be hidden behind the "show all" toggle.
 *
 * @param int   $index Position of the branch in the rendered list.
 * @param array $node  Tree node being rendered.
 * @return bool True when the branch belongs to the collapsed overflow.
 */
$is_overflow_term = function ( int $index, array $node ) use ( $has_overflow, $max_visible, $branch_has_selection ) : bool {
	if ( ! $has_overflow || $index < $max_visible ) {
		return false;
	}

	return ! $branch_has_selection( $node );
};

/**
 * Build the URL that selects a single term, replacing the current selection.
 *
 * @param WP_Term $term Term to select.
 * @return string URL for the term.
 */
$select_url = function ( WP_Term $term ) use ( $query_var, $page_var, $base_url ) : string {
	return add_query_arg( [ $query_var => $term->slug, $page_var => false ], $base_url );
};

/**
 * Build the URL that toggles a term on or off within the current selection.
 *
 * @param WP_Term $term Term to toggle.
 * @return string URL representing the selection with this term flipped.
 */
$toggle_url = function ( WP_Term $term ) use ( $selected_terms, $query_var, $page_var, $base_url ) : string {
	$slug = urldecode( $term->slug );
	$next = in_array( $slug, $selected_terms, true )
		? array_diff( $selected_terms, [ $slug ] )
		: array_merge( $selected_terms, [ $slug ] );
	$next = array_filter( $next );

	return empty( $next )
		? $base_url
		: add_query_arg( [ $query_var => implode( ',', $next ), $page_var => false ], $base_url );
};

/**
 * Render the input for one term, in the current display type.
 *
 * @param WP_Term $term Term to render.
 * @return void
 */
$render_input = function ( WP_Term $term ) use ( $display_type, $id, $is_selected, $select_url, $toggle_url ) : void {
	if ( $display_type === 'radio' ) {
		printf(
			'<input type="radio" name="%s" value="%s" data-wp-on--change="actions.navigate" %s />',
			esc_attr( $id ),
			esc_attr( $select_url( $term ) ),
			checked( $is_selected( $term ), true, false )
		);
		return;
	}

	printf(
		'<input type="checkbox" value="%s" data-wp-on--change="actions.navigate" %s />',
		esc_attr( $toggle_url( $term ) ),
		checked( $is_selected( $term ), true, false )
	);
};

/**
 * Render a list of tree nodes as nested markup, recursing into children.
 *
 * Only used for the nested and collapsed hierarchy modes. In collapsed mode
 * each parent carries an `expanded` flag in its own interactivity context, so
 * a branch opens and closes independently; a branch holding the active
 * selection starts open so the control never hides its own state.
 *
 * @param array[] $nodes Tree nodes at one level.
 * @param int     $depth Depth of these nodes, zero for the top level.
 * @return void
 */
$render_branch = function ( array $nodes, int $depth ) use ( &$render_branch, $hierarchy, $render_input, $is_overflow_term, $branch_has_selection, $term_label ) : void {
	printf(
		'<ul class="wp-block-query-filter__term-list" data-depth="%d"%s>',
		(int) $depth,
		$depth > 0 && $hierarchy === 'collapsed' ? ' data-wp-bind--hidden="!context.expanded"' : ''
	);

	foreach ( $nodes as $index => $node ) {
		$term = $node['term'];
		$has_children = ! empty( $node['children'] );
		$classes = [ 'wp-block-query-filter__term' ];
		$item_attributes = '';

		if ( $has_children ) {
			$classes[] = 'has-children';
		}

		if ( $depth === 0 && $is_overflow_term( $index, $node ) ) {
			$classes[] = 'is-overflow-term';
			$item_attributes .= ' data-wp-bind--hidden="!context.showAllTerms"';
		}

		if ( $has_children && $hierarchy === 'collapsed' ) {
			$item_attributes .= sprintf(
				' data-wp-context="%s"',
				esc_attr( wp_json_encode( [ 'expanded' => $branch_has_selection( $node ) ] ) )
			);
		}

		// phpcs:ignore HM.Security.EscapeOutput.OutputNotEscaped -- Assembled above from literal attribute names and esc_attr()'d values.
		printf( '<li class="%s"%s>', esc_attr( implode( ' ', $classes ) ), $item_attributes );
		echo '<label>';
		$render_input( $term );
		echo $term_label( $term ); // phpcs:ignore HM.Security.EscapeOutput.OutputNotEscaped -- Escaped in $term_label().
		echo '</label>';

		if ( $has_children && $hierarchy === 'collapsed' ) {
			printf(
				'<button type="button" class="wp-block-query-filter__toggle-children" data-wp-on--click="actions.toggleChildren" data-wp-bind--aria-expanded="context.expanded"><span class="screen-reader-text">%s</span></button>',
				/* translators: %s: parent term name. */
				esc_html( sprintf( __( 'Toggle terms within %s', 'query-filter' ), $term->name ) )
			);
		}

		if ( $has_children ) {
			$render_branch( $node['children'], $depth + 1 );
		}

		echo '</li>';
	}

	echo '</ul>';
};

$context = [];

if ( $has_overflow ) {
	$context['showAllTerms'] = false;
}

$group_classes = sprintf(
	'wp-block-query-filter-taxonomy__%1$s-group wp-block-query-filter__%1$s-group%2$s%3$s',
	$display_type,
	$layout_direction === 'horizontal' ? ' horizontal' : '',
	$hierarchy === 'flat' ? '' : ' is-hierarchy-' . $hierarchy
);
?>

<div <?php echo get_block_wrapper_attributes( [ 'class' => 'wp-block-query-filter' ] ); ?> data-wp-interactive="query-filter" data-wp-context="<?php echo esc_attr( wp_json_encode( (object) $context ) ); ?>">
	<label class="wp-block-query-filter-taxonomy__label wp-block-query-filter__label<?php echo $attributes['showLabel'] ? '' : ' screen-reader-text'; ?>" for="<?php echo esc_attr( $id ); ?>">
		<?php echo esc_html( $attributes['label'] ?? $taxonomy->label ); ?>
	</label>

	<?php if ( $display_type === 'select' ) : ?>
		<select class="wp-block-query-filter-taxonomy__select wp-block-query-filter__select" id="<?php echo esc_attr( $id ); ?>" data-wp-on--change="actions.navigate">
			<option value="<?php echo esc_attr( $base_url ); ?>"><?php echo esc_html( $attributes['emptyLabel'] ?: __( 'All', 'query-filter' ) ); ?></option>
			<?php foreach ( \HM\Query_Loop_Filter\flatten_term_tree( $tree ) as $row ) : ?>
				<option value="<?php echo esc_attr( $select_url( $row['term'] ) ); ?>" <?php selected( $is_selected( $row['term'] ) ); ?>><?php
					// A select has no nesting of its own, so depth is conveyed the way
					// WordPress's own category dropdown does it: by a dash per level.
					echo esc_html( str_repeat( '— ', $row['depth'] ) ) . $term_label( $row['term'], false ); // phpcs:ignore HM.Security.EscapeOutput.OutputNotEscaped -- Escaped in $term_label().
				?></option>
			<?php endforeach; ?>
		</select>
	<?php elseif ( $hierarchy !== 'flat' ) : ?>
		<div class="<?php echo esc_attr( $group_classes ); ?>">
			<?php if ( $display_type === 'radio' ) : ?>
				<label>
					<input type="radio" id="<?php echo esc_attr( $id ); ?>" name="<?php echo esc_attr( $id ); ?>" value="<?php echo esc_attr( $base_url ); ?>" data-wp-on--change="actions.navigate" <?php checked( empty( $_GET[ $query_var ] ) ); ?> />
					<?php echo esc_html( $attributes['emptyLabel'] ?: __( 'All', 'query-filter' ) ); ?>
				</label>
			<?php endif; ?>
			<?php $render_branch( $tree, 0 ); ?>
			<?php if ( $has_overflow ) : ?>
				<button type="button" class="wp-block-query-filter__show-all" data-wp-on--click="actions.toggleAllTerms" data-wp-bind--hidden="context.showAllTerms">
					<?php echo esc_html( $show_all_label ); ?>
				</button>
			<?php endif; ?>
		</div>
	<?php elseif ( $display_type === 'radio' ) : ?>
		<div class="<?php echo esc_attr( $group_classes ); ?>">
			<label>
				<input type="radio" id="<?php echo esc_attr( $id ); ?>" name="<?php echo esc_attr( $id ); ?>" value="<?php echo esc_attr( $base_url ); ?>" data-wp-on--change="actions.navigate" <?php checked( empty( $_GET[ $query_var ] ) ); ?> />
				<?php echo esc_html( $attributes['emptyLabel'] ?: __( 'All', 'query-filter' ) ); ?>
			</label>
			<?php foreach ( $terms as $term ) : ?>
				<label>
					<?php $render_input( $term ); ?>
					<?php echo $term_label( $term ); // phpcs:ignore HM.Security.EscapeOutput.OutputNotEscaped -- Escaped in $term_label(). ?>
				</label>
			<?php endforeach; ?>
		</div>
	<?php elseif ( $display_type === 'checkbox' ) : ?>
		<div class="<?php echo esc_attr( $group_classes ); ?>">
			<?php foreach ( $tree as $index => $node ) : ?>
				<label<?php echo $is_overflow_term( $index, $node ) ? ' class="is-overflow-term" data-wp-bind--hidden="!context.showAllTerms"' : ''; ?>>
					<?php $render_input( $node['term'] ); ?>
					<?php echo $term_label( $node['term'] ); // phpcs:ignore HM.Security.EscapeOutput.OutputNotEscaped -- Escaped in $term_label(). ?>
				</label>
			<?php endforeach; ?>
			<?php if ( $has_overflow ) : ?>
				<button type="button" class="wp-block-query-filter__show-all" data-wp-on--click="actions.toggleAllTerms" data-wp-bind--hidden="context.showAllTerms">
					<?php echo esc_html( $show_all_label ); ?>
				</button>
			<?php endif; ?>
		</div>
	<?php endif; ?>
</div>

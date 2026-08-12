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

// Terms past the cap are collapsed behind a "show all" toggle. A term the visitor has
// already selected is always visible, so the control never hides its own active state.
$max_visible = (int) ( $attributes['maxVisibleTerms'] ?? 0 );
$has_overflow = $max_visible > 0 && count( $terms ) > $max_visible;
$show_all_label = $attributes['showAllLabel'] ?: __( 'See all', 'query-filter' );

/**
 * Return whether a term should be hidden behind the "show all" toggle.
 *
 * @param int     $index Position of the term in the rendered list.
 * @param WP_Term $term  Term being rendered.
 * @return bool True when the term belongs to the collapsed overflow.
 */
$is_overflow_term = function ( int $index, WP_Term $term ) use ( $has_overflow, $max_visible, $selected_terms ) : bool {
	if ( ! $has_overflow || $index < $max_visible ) {
		return false;
	}

	return ! in_array( urldecode( $term->slug ), $selected_terms, true );
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

$context = [];

if ( $has_overflow ) {
	$context['showAllTerms'] = false;
}
?>

<div <?php echo get_block_wrapper_attributes( [ 'class' => 'wp-block-query-filter' ] ); ?> data-wp-interactive="query-filter" data-wp-context="<?php echo esc_attr( wp_json_encode( (object) $context ) ); ?>">
	<label class="wp-block-query-filter-taxonomy__label wp-block-query-filter__label<?php echo $attributes['showLabel'] ? '' : ' screen-reader-text'; ?>" for="<?php echo esc_attr( $id ); ?>">
		<?php echo esc_html( $attributes['label'] ?? $taxonomy->label ); ?>
	</label>

	<?php if ( $display_type === 'select' ) : ?>
		<select class="wp-block-query-filter-taxonomy__select wp-block-query-filter__select" id="<?php echo esc_attr( $id ); ?>" data-wp-on--change="actions.navigate">
			<option value="<?php echo esc_attr( $base_url ); ?>"><?php echo esc_html( $attributes['emptyLabel'] ?: __( 'All', 'query-filter' ) ); ?></option>
			<?php foreach ( $terms as $term ) : ?>
				<option value="<?php
					echo esc_attr( add_query_arg( [ $query_var => $term->slug, $page_var => false ], $base_url ) );
				?>" <?php selected( urldecode( $term->slug ), $current_value ); ?>><?php echo esc_html( $term->name ); ?></option>
			<?php endforeach; ?>
		</select>
	<?php elseif ( $display_type === 'radio' ) : ?>
		<div class="wp-block-query-filter-taxonomy__radio-group wp-block-query-filter__radio-group<?php echo $layout_direction === 'horizontal' ? ' horizontal' : ''; ?>">
			<label>
				<input type="radio" id="<?php echo esc_attr( $id ); ?>" name="<?php echo esc_attr( $id ); ?>" value="<?php echo esc_attr( $base_url ); ?>" data-wp-on--change="actions.navigate" <?php checked( empty( $_GET[ $query_var ] ) ); ?> />
				<?php echo esc_html( $attributes['emptyLabel'] ?: __( 'All', 'query-filter' ) ); ?>
			</label>
			<?php foreach ( $terms as $term ) : ?>
				<label>
					<input type="radio" name="<?php echo esc_attr( $id ); ?>" value="<?php
						echo esc_attr( add_query_arg( [ $query_var => $term->slug, $page_var => false ], $base_url ) );
					?>" data-wp-on--change="actions.navigate" <?php checked( urldecode( $term->slug ), $current_value ); ?> />
					<?php echo esc_html( $term->name ); ?>
				</label>
			<?php endforeach; ?>
		</div>
	<?php elseif ( $display_type === 'checkbox' ) : ?>
		<div class="wp-block-query-filter-taxonomy__checkbox-group wp-block-query-filter__checkbox-group<?php echo $layout_direction === 'horizontal' ? ' horizontal' : ''; ?>">
			<?php foreach ( $terms as $index => $term ) : ?>
				<label<?php echo $is_overflow_term( $index, $term ) ? ' class="is-overflow-term" data-wp-bind--hidden="!context.showAllTerms"' : ''; ?>>
					<input type="checkbox" value="<?php echo esc_attr( $toggle_url( $term ) ); ?>" data-wp-on--change="actions.navigate" <?php checked( in_array( urldecode( $term->slug ), $selected_terms, true ) ); ?> />
					<?php echo esc_html( $term->name ); ?>
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

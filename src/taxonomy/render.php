<?php
if ( empty( $attributes['taxonomy'] ) ) {
	return;
}

$id = 'query-filter-' . wp_generate_uuid4();

$taxonomy = get_taxonomy( $attributes['taxonomy'] );

if ( $block->context['query']['inherit'] ) {
	$query_var = sprintf( 'query-%s', $attributes['taxonomy'] );
	$page_var = 'page';
	$base_url = str_replace( '/page/' . get_query_var( 'paged' ), '', remove_query_arg( [ $query_var, $page_var ] ) );
} else {
	$query_id = $block->context['queryId'] ?? 0;
	$query_var = sprintf( 'query-%d-%s', $query_id, $attributes['taxonomy'] );
	$page_var = isset( $block->context['queryId'] ) ? 'query-' . $block->context['queryId'] . '-page' : 'query-page';
	$base_url = remove_query_arg( [ $query_var, $page_var ] );
}

// 2025.08 - add support for both basic and Advanced Query Loop tax filtering
// get_terms doesn't support all possibilities from AQL, limit to include/exclude
// users could specify nonsense queries, ie same terms in include/exclude, but get_terms only supports one or the other, and include takes priority
$args = [
	'hide_empty' => true,
	'taxonomy' => $attributes['taxonomy'],
	'number' => 100,
	'include' => [],
	'exclude' => [],
	'exclude_tree' => [],
];

// AQL first, it has priority.  AND not supported for more than one query.
if ( isset( $block->context['query']['tax_query']['queries'] ) and is_array( $block->context['query']['tax_query']['queries'] ) and count( $block->context['query']['tax_query']['queries'] ) > 0 and ( $block->context['query']['tax_query']['relation'] == 'OR' or count( $block->context['query']['tax_query']['queries'] ) == 1 ) ) {
	foreach( $block->context['query']['tax_query']['queries'] as $qry ) {
		// ignore unsupported queries
		if ( $qry['taxonomy'] != $attributes['taxonomy'] or count( $qry['terms'] ) < 1 or ! in_array( $qry['operator'], ['IN', 'NOT IN'] ) ) {
			continue;
		}
		// which array are we going to add to?
		$add_to = 'include';
		if ( $qry['operator'] == 'NOT IN' ) {
			if ( $qry['include_children'] ) {
				$add_to = 'exclude_tree';
			} else {
				$add_to = 'exclude';
			}
		}
		// AQL uses term names, not IDs
		foreach( $qry['terms'] as $term ) {
			$t = get_term_by('name', $term, $attributes['taxonomy']);
			if ( $t ) {
				$args[ $add_to ][] = $t->term_id;
			}
		}
	}


} elseif ( isset( $block->context['query']['taxQuery'][ $attributes['taxonomy'] ] ) and is_array( $block->context['query']['taxQuery'][ $attributes['taxonomy'] ] ) and count( $block->context['query']['taxQuery'][ $attributes['taxonomy'] ] ) > 0 ) {
	// much simpler
	$args['include'] = $block->context['query']['taxQuery'][ $attributes['taxonomy'] ];
}

$terms = get_terms( $args );

if ( is_wp_error( $terms ) || empty( $terms ) ) {
	return;
}
?>

<div <?php echo get_block_wrapper_attributes( [ 'class' => 'wp-block-query-filter' ] ); ?> data-wp-interactive="query-filter" data-wp-context="{}">
	<label class="wp-block-query-filter-post-type__label wp-block-query-filter__label<?php echo $attributes['showLabel'] ? '' : ' screen-reader-text' ?>" for="<?php echo esc_attr( $id ); ?>">
		<?php echo esc_html( $attributes['label'] ?? $taxonomy->label ); ?>
	</label>
	<select class="wp-block-query-filter-post-type__select wp-block-query-filter__select" id="<?php echo esc_attr( $id ); ?>" data-wp-on--change="actions.navigate">
		<option value="<?php echo esc_attr( $base_url ) ?>"><?php echo esc_html( $attributes['emptyLabel'] ?: __( 'All', 'query-filter' ) ); ?></option>
		<?php foreach ( $terms as $term ) : ?>
			<option value="<?php echo esc_attr( add_query_arg( [ $query_var => $term->slug, $page_var => false ], $base_url ) ) ?>" <?php selected( $term->slug, wp_unslash( $_GET[ $query_var ] ?? '' ) ); ?>><?php echo esc_html( $term->name ); ?></option>
		<?php endforeach; ?>
	</select>
</div>

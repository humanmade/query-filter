<?php
if ( empty( $attributes['taxonomy'] ) ) {
	return;
}

$id = 'query-filter-' . wp_generate_uuid4();

$query_id = $block->context['queryId'] ?? 0;
if ( $block->context['query']['inherit'] ) {
	$query_var = $attributes['taxonomy'];
	$page_var = 'page';
} else {
	$query_var = sprintf( 'query-%d-%s', $query_id, $attributes['taxonomy'] );
	$page_var = sprintf( 'query-%d-page', $query_id );
}

$taxonomy = get_taxonomy( $attributes['taxonomy'] );

$terms = get_terms( [
	'hide_empty' => true,
	'taxonomy' => $attributes['taxonomy'],
	'number' => 100,
] );

if ( is_wp_error( $terms ) || empty( $terms ) ) {
	return;
}
?>

<div <?php echo get_block_wrapper_attributes( [ 'class' => 'wp-block-query-filter' ] ); ?> data-wp-interactive="query-filter" data-wp-context="{}">
	<label class="wp-block-query-filter-post-type__label wp-block-query-filter__label<?php echo $attributes['showLabel'] ? '' : ' screen-reader-text' ?>" for="<?php echo esc_attr( $id ); ?>">
		<?php echo esc_html( $attributes['label'] ?? $taxonomy->label ); ?>
	</label>
	<select class="wp-block-query-filter-post-type__select wp-block-query-filter__select" id="<?php echo esc_attr( $id ); ?>" data-wp-on--change="actions.navigate">
		<option value="<?php echo esc_attr( remove_query_arg( [ $query_var, $page_var ] ) ) ?>"><?php echo esc_html( $attributes['emptyLabel'] ?: __( 'All', 'query-filter' ) ); ?></option>
		<?php foreach ( $terms as $term ) : ?>
			<option value="<?php echo esc_attr( add_query_arg( [ $query_var => $term->slug, $page_var => false ] ) ) ?>" <?php selected( $term->slug, wp_unslash( $_GET[ $query_var ] ?? '' ) ); ?>><?php echo esc_html( $term->name ); ?></option>
		<?php endforeach; ?>
	</select>
</div>

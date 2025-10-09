<?php
/**
 * Render callback for the meta filter block.
 *
 * @package query-filter
 */

if ( empty( $attributes['metaKey'] ) ) {
	return;
}

$id = 'query-filter-' . wp_generate_uuid4();
$meta_key = $attributes['metaKey'];

// Get query context
if ( empty( $block->context['query']['inherit'] ) ) {
	$query_id = $block->context['queryId'] ?? 0;
	$query_var = sprintf( 'query-%d-meta-%s', $query_id, sanitize_key( $meta_key ) );
	$page_var = isset( $block->context['queryId'] ) ? 'query-' . $block->context['queryId'] . '-page' : 'query-page';
	$base_url = remove_query_arg( [ $query_var, $page_var ] );
} else {
	$query_var = sprintf( 'query-meta-%s', sanitize_key( $meta_key ) );
	$page_var = 'page';
	$base_url = str_replace( '/page/' . get_query_var( 'paged' ), '', remove_query_arg( [ $query_var, $page_var ] ) );
}

// Get post types from query context
$post_types = $block->context['query']['postType'] ?? [ 'post' ];
$post_types = is_array( $post_types ) ? $post_types : [ $post_types ];

// Fetch distinct meta values
$meta_values = HM\Query_Loop_Filter\get_distinct_meta_values( $meta_key, $post_types );

if ( empty( $meta_values ) ) {
	return;
}

?>

<div <?php echo get_block_wrapper_attributes( [ 'class' => 'wp-block-query-filter' ] ); ?> data-wp-interactive="query-filter" data-wp-context="{}">
	<label class="wp-block-query-filter-meta__label wp-block-query-filter__label<?php echo $attributes['showLabel'] ? '' : ' screen-reader-text' ?>" for="<?php echo esc_attr( $id ); ?>">
		<?php echo esc_html( $attributes['label'] ?? $meta_key ); ?>
	</label>
	<select class="wp-block-query-filter-meta__select wp-block-query-filter__select" id="<?php echo esc_attr( $id ); ?>" data-wp-on--change="actions.navigate">
		<option value="<?php echo esc_attr( $base_url ) ?>"><?php echo esc_html( $attributes['emptyLabel'] ?: __( 'All', 'query-filter' ) ); ?></option>
		<?php foreach ( $meta_values as $value ) : ?>
			<option value="<?php echo esc_attr( add_query_arg( [ $query_var => rawurlencode( $value ), $page_var => false ], $base_url ) ) ?>" <?php selected( $value, wp_unslash( $_GET[ $query_var ] ?? '' ) ); ?>><?php echo esc_html( $value ); ?></option>
		<?php endforeach; ?>
	</select>
</div>

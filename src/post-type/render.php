<?php
$id = 'query-filter-' . wp_generate_uuid4();

$query_id = $block->context['queryId'] ?? 0;
if ( $block->context['query']['inherit'] ) {
	$query_var = 'post_type';
	$page_var = 'page';
} else {
	$query_var = sprintf( 'query-%d-post_type', $query_id );
	$page_var = sprintf( 'query-%d-page', $query_id );
}

$post_types = array_map( 'trim', explode( ',', $block->context['query']['postType'] ?? 'post' ) );

// Support for enhanced query block.
if ( isset( $block->context['query']['multiple_posts'] ) ) {
	$post_types = array_merge( $post_types, $block->context['query']['multiple_posts'] );
}

$post_types = array_map( 'get_post_type_object', $post_types );

if ( empty( $post_types ) ) {
	return;
}
?>

<div <?php echo get_block_wrapper_attributes( [ 'class' => 'wp-block-query-filter' ] ); ?> data-wp-interactive="query-filter" data-wp-context="{}">
	<label class="wp-block-query-filter-post-type__label wp-block-query-filter__label<?php echo $attributes['showLabel'] ? '' : ' screen-reader-text' ?>" for="<?php echo esc_attr( $id ); ?>">
		<?php echo esc_html( $attributes['label'] ?? __( 'Content Type', 'query-filter' ) ); ?>
	</label>
	<select class="wp-block-query-filter-post-type__select wp-block-query-filter__select" id="<?php echo esc_attr( $id ); ?>" data-wp-on--change="actions.navigate">
		<option value="<?php echo esc_attr( remove_query_arg( [ $query_var, $page_var ] ) ) ?>"><?php echo esc_html( $attributes['emptyLabel'] ?: __( 'All', 'query-filter' ) ); ?></option>
		<?php foreach ( $post_types as $post_type ) : ?>
			<option value="<?php echo esc_attr( add_query_arg( [ $query_var => $post_type->name, $page_var => false ] ) ) ?>" <?php selected( $post_type->name, wp_unslash( $_GET[ $query_var ] ?? '' ) ); ?>><?php echo esc_html( $post_type->label ); ?></option>
		<?php endforeach; ?>
	</select>
</div>

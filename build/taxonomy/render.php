<?php
if ( empty( $attributes['taxonomy'] ) ) {
	return;
}

$id = 'query-filter-' . wp_generate_uuid4();

$taxonomy = get_taxonomy( $attributes['taxonomy'] );

$target_query_id = empty( $block->context['query']['inherit'] )
	? (string) ( $block->context['queryId'] ?? 0 )
	: 'main';

$query_var = sprintf( 'query-%s', $attributes['taxonomy'] );
$page_var = 'query-page';
$base_url = remove_query_arg( [ $query_var, $page_var, 'query-post_id', 'query-id' ] );

if ( ! empty( $block->context['query']['inherit'] ) ) {
	$current_paged = (int) get_query_var( 'paged' );
	if ( $current_paged > 1 ) {
		$base_url = str_replace( '/page/' . $current_paged, '', $base_url );
	}
	$base_url = remove_query_arg( [ 'page' ], $base_url );
}

$base_url = add_query_arg(
	[
		'query-post_id' => $target_query_id,
	],
	$base_url
);
$base_url = HM\Query_Loop_Filter\normalize_query_filter_url( $base_url );

$terms = [];

if ( ! empty( $attributes['limitToCurrentResults'] ) ) {
	$post_ids = HM\Query_Loop_Filter\get_query_loop_post_ids_for_block( $block );

	if ( ! empty( $post_ids ) ) {
		$terms = wp_get_object_terms(
			$post_ids,
			$attributes['taxonomy'],
			[
				'orderby' => 'name',
				'order' => 'ASC',
				'number' => 100,
			]
		);
	}

	if ( is_wp_error( $terms ) ) {
		return;
	}
}

if ( empty( $terms ) ) {
	$terms = get_terms( [
		'hide_empty' => true,
		'taxonomy' => $attributes['taxonomy'],
		'number' => 100,
	] );
}

if ( is_wp_error( $terms ) || ( empty( $terms ) && empty( $attributes['limitToCurrentResults'] ) ) ) {
	return;
}
?>

<div <?php echo get_block_wrapper_attributes( [ 'class' => 'wp-block-query-filter' ] ); ?> data-wp-interactive="query-filter" data-wp-context="{}">
	<label class="wp-block-query-filter-post-type__label wp-block-query-filter__label<?php echo $attributes['showLabel'] ? '' : ' screen-reader-text' ?>" for="<?php echo esc_attr( $id ); ?>">
		<?php echo esc_html( $attributes['label'] ?? $taxonomy->label ); ?>
	</label>
	<select class="wp-block-query-filter-post-type__select wp-block-query-filter__select" id="<?php echo esc_attr( $id ); ?>" data-wp-on--change="actions.navigate">
		<option value="<?php echo esc_attr( $base_url ) ?>"><?php echo esc_html( $attributes['emptyLabel'] ?: __( 'All', 'query-filter' ) ); ?></option>
		<?php foreach ( $terms as $term ) :
			$value = add_query_arg(
				[
					$query_var => $term->slug,
					$page_var => false,
				],
				$base_url
			);
			$value = HM\Query_Loop_Filter\normalize_query_filter_url( $value );
			?>
			<option value="<?php echo esc_attr( $value ); ?>" <?php selected( $term->slug, wp_unslash( $_GET[ $query_var ] ?? '' ) ); ?>>
				<?php echo esc_html( $term->name ); ?>
			</option>
		<?php endforeach; ?>
	</select>
</div>

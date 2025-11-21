<?php
if ( empty( $block->context['query'] ) ) {
	return;
}

wp_enqueue_script_module( 'query-filter-taxonomy-view-script-module' );

$id = 'query-filter-' . wp_generate_uuid4();
$label = $attributes['label'] ?? __( 'Order Results', 'query-filter' );
$show_label = $attributes['showLabel'] ?? true;

$sort_options = [
	'date_desc' => [
		'label' => __( 'Newest to Oldest', 'query-filter' ),
		'orderby' => 'date',
		'order' => 'DESC',
	],
	'date_asc' => [
		'label' => __( 'Oldest to Newest', 'query-filter' ),
		'orderby' => 'date',
		'order' => 'ASC',
	],
	'title_asc' => [
		'label' => __( 'A → Z', 'query-filter' ),
		'orderby' => 'title',
		'order' => 'ASC',
	],
	'title_desc' => [
		'label' => __( 'Z → A', 'query-filter' ),
		'orderby' => 'title',
		'order' => 'DESC',
	],
	'comment_desc' => [
		'label' => __( 'Most Commented', 'query-filter' ),
		'orderby' => 'comment_count',
		'order' => 'DESC',
	],
	'menu_order' => [
		'label' => __( 'Menu Order', 'query-filter' ),
		'orderby' => 'menu_order',
		'order' => 'ASC',
	],
];

$enabled = array_merge(
	array_fill_keys( array_keys( $sort_options ), true ),
	is_array( $attributes['options'] ?? null ) ? $attributes['options'] : []
);

$target_query_id = empty( $block->context['query']['inherit'] )
	? (string) ( $block->context['queryId'] ?? 0 )
	: 'main';

$orderby_var = 'query-post_orderby';
$page_var = 'query-page';
$base_url = remove_query_arg( [ $orderby_var, $page_var, 'query-post_id', 'query-id' ] );

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

if ( empty( array_filter( $enabled ) ) ) {
	return;
}

$current_selection = sanitize_text_field( wp_unslash( $_GET[ $orderby_var ] ?? '' ) );

?>
<div <?php echo get_block_wrapper_attributes( [ 'class' => 'wp-block-query-filter' ] ); ?> data-wp-interactive="query-filter" data-wp-context="{}">
	<label class="wp-block-query-filter-sort__label wp-block-query-filter__label<?php echo $show_label ? '' : ' screen-reader-text'; ?>" for="<?php echo esc_attr( $id ); ?>">
		<?php echo esc_html( $label ); ?>
	</label>
	<select class="wp-block-query-filter-sort__select wp-block-query-filter__select" id="<?php echo esc_attr( $id ); ?>" data-wp-on--change="actions.navigate">
		<?php foreach ( $sort_options as $key => $option ) :
			if ( empty( $enabled[ $key ] ) ) {
				continue;
			}

			$query_value = $option['orderby'] . ':' . $option['order'];
			$value = add_query_arg(
				[
					$orderby_var => $query_value,
					$page_var => false,
				],
				$base_url
			);
			$value = HM\Query_Loop_Filter\normalize_query_filter_url( $value );
			$is_selected = $current_selection === $query_value;
			?>
			<option value="<?php echo esc_attr( $value ); ?>" <?php selected( $is_selected ); ?>>
				<?php echo esc_html( $option['label'] ); ?>
			</option>
		<?php endforeach; ?>
	</select>
</div>


<?php
/**
 * Render callback for the taxonomy text block.
 *
 * @package query-filter
 */

$result = HM\Query_Loop_Filter\get_taxonomy_text_result(
	$attributes,
	[
		'query' => $block->context['query'] ?? [],
		'queryId' => $block->context['queryId'] ?? null,
	]
);

if ( is_null( $result ) ) {
	return '';
}

$link_url = ( ! empty( $attributes['link'] ) && ! empty( $result['url'] ) )
	? $result['url']
	: '';

$wrapper_attributes = get_block_wrapper_attributes(
	[
		'class' => sprintf(
			'taxonomy-text taxonomy-text--%s',
			sanitize_html_class( $result['filter_type'] )
		),
	]
);

?>
<span <?php echo $wrapper_attributes; ?>>
	<?php if ( $link_url ) : ?>
		<a href="<?php echo esc_url( $link_url ); ?>">
			<?php echo esc_html( $result['text'] ); ?>
		</a>
	<?php else : ?>
		<?php echo esc_html( $result['text'] ); ?>
	<?php endif; ?>
</span>


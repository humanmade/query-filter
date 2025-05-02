<?php
if ( empty( $attributes['taxonomy'] ) ) {
	return;
}

$id = 'query-filter-' . wp_generate_uuid4();

$taxonomy = get_taxonomy( $attributes['taxonomy'] );

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
	<?php if ( $attributes['useCheckboxes'] ) : ?>
		<fieldset class="wp-block-query-filter__checkboxes">
			<legend class="wp-block-query-filter__legend<?php echo $attributes['showLabel'] ? '' : ' screen-reader-text' ?>">
				<?php echo esc_html( $attributes['label'] ?? $taxonomy->label ); ?>
			</legend>
			<?php foreach ( $terms as $term ) :
				$checked = in_array( $term->slug, explode( ',', wp_unslash( $_GET[ $query_var ] ?? '' ) ), true );
				?>
				<span class="wp-block-query-filter__checkboxes-wrapper">
					<input
						type="checkbox"
						name="<?php echo esc_attr( $query_var ); ?>"
						value="<?php echo esc_attr( $term->slug ); ?>"
						id="query-filter-<?php echo esc_attr( $term->slug ); ?>"
						<?php checked( $checked ); ?>
						data-wp-on--change="actions.navigate"
					/>
					<label for="query-filter-<?php echo esc_attr( $term->slug ); ?>"><?php echo esc_html( $term->name ); ?></label>
				</span>
			<?php endforeach; ?>
		</fieldset>
	<?php else : ?>
		<label class="wp-block-query-filter-post-type__label wp-block-query-filter__label<?php echo $attributes['showLabel'] ? '' : ' screen-reader-text' ?>" for="<?php echo esc_attr( $id ); ?>">
			<?php echo esc_html( $attributes['label'] ?? $taxonomy->label ); ?>
		</label>
		<select class="wp-block-query-filter-post-type__select wp-block-query-filter__select" id="<?php echo esc_attr( $id ); ?>" name="<?php echo esc_attr( $query_var ); ?>" data-wp-on--change="actions.navigate">
			<option value=""><?php echo esc_html( $attributes['emptyLabel'] ?: __( 'All', 'query-filter' ) ); ?></option>
			<?php foreach ( $terms as $term ) : ?>
				<option value="<?php echo esc_attr( $term->slug ); ?>" <?php selected( $term->slug, wp_unslash( $_GET[ $query_var ] ?? '' ) ); ?>><?php echo esc_html( $term->name ); ?></option>
			<?php endforeach; ?>
		</select>
	<?php endif; ?>
</div>

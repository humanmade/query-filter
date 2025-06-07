<?php
if (empty($attributes['taxonomy'])) {
	return;
}

$id = 'query-filter-' . wp_generate_uuid4();
$display_type = $attributes['displayType'] ?? 'select';
$layout_direction = $attributes['layoutDirection'] ?? 'vertical';

$taxonomy = get_taxonomy($attributes['taxonomy']);

if (empty($block->context['query']['inherit'])) {
	$query_id = $block->context['queryId'] ?? 0;
	$query_var = sprintf('query-%d-%s', $query_id, $attributes['taxonomy']);
	$page_var = isset($block->context['queryId']) ? 'query-' . $block->context['queryId'] . '-page' : 'query-page';
	$base_url = remove_query_arg([$query_var, $page_var]);
} else {
	$query_var = sprintf('query-%s', $attributes['taxonomy']);
	$page_var = 'page';
	$base_url = str_replace('/page/' . get_query_var('paged'), '', remove_query_arg([$query_var, $page_var]));
}

$terms = get_terms([
	'hide_empty' => true,
	'taxonomy' => $attributes['taxonomy'],
	'number' => 100,
]);

if (is_wp_error($terms) || empty($terms)) {
	return;
}
?>

<div <?php echo get_block_wrapper_attributes(['class' => 'wp-block-query-filter']); ?> data-wp-interactive="query-filter" data-wp-context="{}">
	<label class="wp-block-query-filter-post-type__label wp-block-query-filter__label<?php echo $attributes['showLabel'] ? '' : ' screen-reader-text' ?>" for="<?php echo esc_attr($id); ?>">
		<?php echo esc_html($attributes['label'] ?? $taxonomy->label); ?>
	</label>

	<?php if ($display_type === 'select') : ?>
		<select class="wp-block-query-filter-post-type__select wp-block-query-filter__select" id="<?php echo esc_attr($id); ?>" data-wp-on--change="actions.navigate">
			<option value="<?php echo esc_attr($base_url) ?>"><?php echo esc_html($attributes['emptyLabel'] ?: __('All', 'query-filter')); ?></option>
			<?php foreach ($terms as $term) : ?>
				<option value="<?php echo esc_attr(add_query_arg([$query_var => $term->slug, $page_var => false], $base_url)) ?>" <?php selected($term->slug, wp_unslash($_GET[$query_var] ?? '')); ?>><?php echo esc_html($term->name); ?></option>
			<?php endforeach; ?>
		</select>
	<?php elseif ($display_type === 'radio') : ?>
		<div class="wp-block-query-filter-taxonomy__radio-group wp-block-query-filter__radio-group<?php echo $layout_direction === 'horizontal' ? ' horizontal' : ''; ?>">
			<label>
				<input type="radio" id="<?php echo esc_attr($id); ?>" name="<?php echo esc_attr($id); ?>" value="<?php echo esc_attr($base_url) ?>" data-wp-on--change="actions.navigate" <?php checked(empty($_GET[$query_var])); ?> />
				<?php echo esc_html($attributes['emptyLabel'] ?: __('All', 'query-filter')); ?>
			</label>
			<?php foreach ($terms as $term) : ?>
				<label>
					<input type="radio" name="<?php echo esc_attr($id); ?>" value="<?php echo esc_attr(add_query_arg([$query_var => $term->slug, $page_var => false], $base_url)) ?>" data-wp-on--change="actions.navigate" <?php checked($term->slug, wp_unslash($_GET[$query_var] ?? '')); ?> />
					<?php echo esc_html($term->name); ?>
				</label>
			<?php endforeach; ?>
		</div>
	<?php elseif ($display_type === 'checkbox') : ?>
		<div class="wp-block-query-filter-taxonomy__checkbox-group wp-block-query-filter__checkbox-group<?php echo $layout_direction === 'horizontal' ? ' horizontal' : ''; ?>">
			<?php
			$selected_terms = isset($_GET[$query_var]) ? explode(',', wp_unslash($_GET[$query_var])) : [];
			?>
			<?php foreach ($terms as $term) : ?>
				<?php
				$is_checked = in_array($term->slug, $selected_terms);
				$new_terms = $is_checked
					? array_diff($selected_terms, [$term->slug])
					: array_merge($selected_terms, [$term->slug]);
				$new_terms = array_filter($new_terms);
				$checkbox_url = empty($new_terms)
					? $base_url
					: add_query_arg([$query_var => implode(',', $new_terms), $page_var => false], $base_url);
				?>
				<label>
					<input type="checkbox" value="<?php echo esc_attr($checkbox_url); ?>" data-wp-on--change="actions.navigate" <?php checked($is_checked); ?> />
					<?php echo esc_html($term->name); ?>
				</label>
			<?php endforeach; ?>
		</div>
	<?php endif; ?>
</div>
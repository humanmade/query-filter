<?php
global $wp_query;

$id = 'query-filter-' . wp_generate_uuid4();
$display_type = $attributes['displayType'] ?? 'select';
$layout_direction = $attributes['layoutDirection'] ?? 'vertical';

if ($block->context['query']['inherit']) {
	$query_var = 'query-post_type';
	$page_var = 'page';
	$base_url = str_replace('/page/' . get_query_var('paged'), '', remove_query_arg([$query_var, $page_var]));
} else {
	$query_id = $block->context['queryId'] ?? 0;
	$query_var = sprintf('query-%d-post_type', $query_id);
	$page_var = isset($block->context['queryId']) ? 'query-' . $block->context['queryId'] . '-page' : 'query-page';
	$base_url = remove_query_arg([$query_var, $page_var]);
}

$post_types = array_map('trim', explode(',', $block->context['query']['postType'] ?? 'post'));

// Support for enhanced query block.
if (isset($block->context['query']['multiple_posts']) && is_array($block->context['query']['multiple_posts'])) {
	$post_types = array_merge($post_types, $block->context['query']['multiple_posts']);
}

// Fill in inherited query types.
if ($block->context['query']['inherit']) {
	$inherited_post_types = $wp_query->get('query-filter-post_type') === 'any'
		? get_post_types(['public' => true, 'exclude_from_search' => false])
		: (array) $wp_query->get('query-filter-post_type');

	$post_types = array_merge($post_types, $inherited_post_types);
	if (! get_option('wp_attachment_pages_enabled')) {
		$post_types = array_diff($post_types, ['attachment']);
	}
}

$post_types = array_unique($post_types);
$post_types = array_map('get_post_type_object', $post_types);

if (empty($post_types)) {
	return;
}
?>

<div <?php echo get_block_wrapper_attributes(['class' => 'wp-block-query-filter']); ?> data-wp-interactive="query-filter" data-wp-context="{}">
	<label class="wp-block-query-filter-post-type__label wp-block-query-filter__label<?php echo $attributes['showLabel'] ? '' : ' screen-reader-text' ?>" for="<?php echo esc_attr($id); ?>">
		<?php echo esc_html($attributes['label'] ?? __('Content Type', 'query-filter')); ?>
	</label>

	<?php if ($display_type === 'select') : ?>
		<select class="wp-block-query-filter-post-type__select wp-block-query-filter__select" id="<?php echo esc_attr($id); ?>" data-wp-on--change="actions.navigate">
			<option value="<?php echo esc_attr($base_url) ?>"><?php echo esc_html($attributes['emptyLabel'] ?: __('All', 'query-filter')); ?></option>
			<?php foreach ($post_types as $post_type) : ?>
				<option value="<?php echo esc_attr(add_query_arg([$query_var => $post_type->name, $page_var => false], $base_url)) ?>" <?php selected($post_type->name, wp_unslash($_GET[$query_var] ?? '')); ?>><?php echo esc_html($post_type->label); ?></option>
			<?php endforeach; ?>
		</select>
	<?php elseif ($display_type === 'radio') : ?>
		<div class="wp-block-query-filter-post-type__radio-group wp-block-query-filter__radio-group<?php echo $layout_direction === 'horizontal' ? ' horizontal' : ''; ?>">
			<label>
				<input type="radio" id="<?php echo esc_attr($id); ?>" name="<?php echo esc_attr($id); ?>" value="<?php echo esc_attr($base_url) ?>" data-wp-on--change="actions.navigate" <?php checked(empty($_GET[$query_var])); ?> />
				<?php echo esc_html($attributes['emptyLabel'] ?: __('All', 'query-filter')); ?>
			</label>
			<?php foreach ($post_types as $post_type) : ?>
				<label>
					<input type="radio" name="<?php echo esc_attr($id); ?>" value="<?php echo esc_attr(add_query_arg([$query_var => $post_type->name, $page_var => false], $base_url)) ?>" data-wp-on--change="actions.navigate" <?php checked($post_type->name, wp_unslash($_GET[$query_var] ?? '')); ?> />
					<?php echo esc_html($post_type->label); ?>
				</label>
			<?php endforeach; ?>
		</div>
	<?php elseif ($display_type === 'checkbox') : ?>
		<div class="wp-block-query-filter-post-type__checkbox-group wp-block-query-filter__checkbox-group<?php echo $layout_direction === 'horizontal' ? ' horizontal' : ''; ?>">
			<?php
			$selected_types = isset($_GET[$query_var]) ? explode(',', wp_unslash($_GET[$query_var])) : [];
			?>
			<?php foreach ($post_types as $post_type) : ?>
				<?php
				$is_checked = in_array($post_type->name, $selected_types);
				$new_types = $is_checked
					? array_diff($selected_types, [$post_type->name])
					: array_merge($selected_types, [$post_type->name]);
				$new_types = array_filter($new_types);
				$checkbox_url = empty($new_types)
					? $base_url
					: add_query_arg([$query_var => implode(',', $new_types), $page_var => false], $base_url);
				?>
				<label>
					<input type="checkbox" value="<?php echo esc_attr($checkbox_url); ?>" data-wp-on--change="actions.navigate" <?php checked($is_checked); ?> />
					<?php echo esc_html($post_type->label); ?>
				</label>
			<?php endforeach; ?>
		</div>
	<?php endif; ?>
</div>
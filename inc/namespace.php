<?php
/**
 * Query filter main file.
 *
 * @package query-filter
 */

namespace HM\Query_Loop_Filter;

use WP_HTML_Tag_Processor;
use WP_Query;

/**
 * Connect namespace methods to hooks and filters.
 *
 * @return void
 */
function bootstrap() : void {
	// General hooks.
	add_filter( 'query_loop_block_query_vars', __NAMESPACE__ . '\\filter_query_loop_block_query_vars', 10, 3 );
	add_action( 'pre_get_posts', __NAMESPACE__ . '\\pre_get_posts_transpose_query_vars' );
	add_filter( 'block_type_metadata', __NAMESPACE__ . '\\filter_block_type_metadata', 10 );
	add_action( 'init', __NAMESPACE__ . '\\register_blocks' );
	add_action( 'enqueue_block_assets', __NAMESPACE__ . '\\action_wp_enqueue_scripts' );
	add_action( 'rest_api_init', __NAMESPACE__ . '\\register_rest_routes' );

	// Search.
	add_filter( 'render_block_core/search', __NAMESPACE__ . '\\render_block_search', 10, 3 );

	// Query.
	add_filter( 'render_block_core/query', __NAMESPACE__ . '\\render_block_query', 10, 3 );
}

/**
 * Fires when scripts and styles are enqueued.
 *
 * @TODO work out why this doesn't work but building interactivity via the blocks does.
 */
function action_wp_enqueue_scripts() : void {
	$asset = include ROOT_DIR . '/build/taxonomy/index.asset.php';
	wp_register_style(
		'query-filter-view',
		plugins_url( '/build/taxonomy/index.css', PLUGIN_FILE ),
		[],
		$asset['version']
	);
}

/**
 * Fires after WordPress has finished loading but before any headers are sent.
 *
 */
function register_blocks() : void {
	register_block_type( ROOT_DIR . '/build/taxonomy' );
	register_block_type( ROOT_DIR . '/build/post-type' );
	register_block_type( ROOT_DIR . '/build/meta' );
}

/**
 * Filters the arguments which will be passed to `WP_Query` for the Query Loop Block.
 *
 * @param array     $query Array containing parameters for <code>WP_Query</code> as parsed by the block context.
 * @param \WP_Block $block Block instance.
 * @param int       $page  Current query's page.
 * @return array Array containing parameters for <code>WP_Query</code> as parsed by the block context.
 */
function filter_query_loop_block_query_vars( array $query, \WP_Block $block, int $page ) : array {
	if ( isset( $block->context['queryId'] ) ) {
		$query['query_id'] = $block->context['queryId'];
	}

	return $query;
}

/**
 * Fires after the query variable object is created, but before the actual query is run.
 *
 * @param  WP_Query $query The WP_Query instance (passed by reference).
 */
function pre_get_posts_transpose_query_vars( WP_Query $query ) : void {
	$query_id = $query->get( 'query_id', null );

	if ( ! $query->is_main_query() && is_null( $query_id ) ) {
		return;
	}

	$prefix = $query->is_main_query() ? 'query-' : "query-{$query_id}-";
	$tax_query = [];
	$meta_query = [];
	$valid_keys = [
		'post_type' => $query->is_search() ? 'any' : 'post',
		's' => '',
	];

	// Preserve valid params for later retrieval.
	foreach ( $valid_keys as $key => $default ) {
		$query->set(
			"query-filter-$key",
			$query->get( $key, $default )
		);
	}

	// Map get params to this query.
	foreach ( $_GET as $key => $value ) {
		if ( strpos( $key, $prefix ) === 0 ) {
			$key = str_replace( $prefix, '', $key );
			$value = sanitize_text_field( urldecode( wp_unslash( $value ) ) );

			// Handle meta queries.
			if ( strpos( $key, 'meta-' ) === 0 ) {
				$meta_key = str_replace( 'meta-', '', $key );
				$meta_query['relation'] = 'AND';
				$meta_query[] = [
					'key' => $meta_key,
					'value' => $value,
					'compare' => '=',
				];
			}
			// Handle taxonomies specifically.
			elseif ( get_taxonomy( $key ) ) {
				$tax_query['relation'] = 'AND';
				$tax_query[] = [
					'taxonomy' => $key,
					'terms' => [ $value ],
					'field' => 'slug',
				];
			} else {
				// Other options should map directly to query vars.
				$key = sanitize_key( $key );

				if ( ! in_array( $key, array_keys( $valid_keys ), true ) ) {
					continue;
				}

				$query->set(
					$key,
					$value
				);
			}
		}
	}

	if ( ! empty( $tax_query ) ) {
		$existing_query = $query->get( 'tax_query', [] );

		if ( ! empty( $existing_query ) ) {
			$tax_query = [
				'relation' => 'AND',
				[ $existing_query ],
				$tax_query,
			];
		}

		$query->set( 'tax_query', $tax_query );
	}

	if ( ! empty( $meta_query ) ) {
		$existing_meta_query = $query->get( 'meta_query', [] );

		if ( ! empty( $existing_meta_query ) ) {
			$meta_query = [
				'relation' => 'AND',
				[ $existing_meta_query ],
				$meta_query,
			];
		}

		$query->set( 'meta_query', $meta_query );
	}
}

/**
 * Filters the settings determined from the block type metadata.
 *
 * @param array $metadata Metadata provided for registering a block type.
 * @return array Array of metadata for registering a block type.
 */
function filter_block_type_metadata( array $metadata ) : array {
	// Add query context to search block.
	if ( $metadata['name'] === 'core/search' ) {
		$metadata['usesContext'] = array_merge( $metadata['usesContext'] ?? [], [ 'queryId', 'query' ] );
	}

	return $metadata;
}

/**
 * Filters the content of a single block.
 *
 * @param string    $block_content The block content.
 * @param array     $block         The full block, including name and attributes.
 * @param \WP_Block $instance      The block instance.
 * @return string The block content.
 */
function render_block_search( string $block_content, array $block, \WP_Block $instance ) : string {
	if ( empty( $instance->context['query'] ) ) {
		return $block_content;
	}

	wp_enqueue_script_module( 'query-filter-taxonomy-view-script-module' );

	$query_var = empty( $instance->context['query']['inherit'] )
		? sprintf( 'query-%d-s', $instance->context['queryId'] ?? 0 )
		: 's';

	$action = str_replace( '/page/'. get_query_var( 'paged', 1 ), '', add_query_arg( [ $query_var => '' ] ) );

	// Note sanitize_text_field trims whitespace from start/end of string causing unexpected behaviour.
	$value = wp_unslash( $_GET[ $query_var ] ?? '' );
	$value = urldecode( $value );
	$value = wp_check_invalid_utf8( $value );
	$value = wp_pre_kses_less_than( $value );
	$value = strip_tags( $value );

	wp_interactivity_state( 'query-filter', [
		'searchValue' => $value,
	] );

	$block_content = new WP_HTML_Tag_Processor( $block_content );
	$block_content->next_tag( [ 'tag_name' => 'form' ] );
	$block_content->set_attribute( 'action', $action );
	$block_content->set_attribute( 'data-wp-interactive', 'query-filter' );
	$block_content->set_attribute( 'data-wp-on--submit', 'actions.search' );
	$block_content->set_attribute( 'data-wp-context', '{searchValue:""}' );
	$block_content->next_tag( [ 'tag_name' => 'input', 'class_name' => 'wp-block-search__input' ] );
	$block_content->set_attribute( 'name', $query_var );
	$block_content->set_attribute( 'inputmode', 'search' );
	$block_content->set_attribute( 'value', $value );
	$block_content->set_attribute( 'data-wp-bind--value', 'state.searchValue' );
	$block_content->set_attribute( 'data-wp-on--input', 'actions.search' );

	return (string) $block_content;
}

/**
 * Add data attributes to the query block to describe the block query.
 *
 * @param string    $block_content Default query content.
 * @param array     $block         Parsed block.
 * @return string
 */
function render_block_query( $block_content, $block ) {
	$block_content = new WP_HTML_Tag_Processor( $block_content );
	$block_content->next_tag();

	// Always allow region updates on interactivity, use standard core region naming.
	$block_content->set_attribute( 'data-wp-router-region', 'query-' . ( $block['attrs']['queryId'] ?? 0 ) );

	return (string) $block_content;
}

/**
 * Register REST API routes for meta filtering.
 *
 * @return void
 */
function register_rest_routes() : void {
	register_rest_route(
		'query-filter/v1',
		'/meta-cardinality',
		[
			'methods' => 'GET',
			'callback' => __NAMESPACE__ . '\\rest_get_meta_cardinality',
			'permission_callback' => function() {
				return current_user_can( 'edit_posts' );
			},
			'args' => [
				'post_type' => [
					'required' => true,
					'type' => 'string',
					'sanitize_callback' => 'sanitize_text_field',
				],
				'meta_key' => [
					'required' => true,
					'type' => 'string',
					'sanitize_callback' => 'sanitize_text_field',
				],
			],
		]
	);

	register_rest_route(
		'query-filter/v1',
		'/meta-values',
		[
			'methods' => 'GET',
			'callback' => __NAMESPACE__ . '\\rest_get_meta_values',
			'permission_callback' => function() {
				return current_user_can( 'edit_posts' );
			},
			'args' => [
				'post_type' => [
					'required' => true,
					'type' => 'string',
					'sanitize_callback' => 'sanitize_text_field',
				],
				'meta_key' => [
					'required' => true,
					'type' => 'string',
					'sanitize_callback' => 'sanitize_text_field',
				],
			],
		]
	);
}

/**
 * REST API callback for getting meta cardinality.
 *
 * @param \WP_REST_Request $request Request object.
 * @return \WP_REST_Response Response object.
 */
function rest_get_meta_cardinality( \WP_REST_Request $request ) : \WP_REST_Response {
	$post_type = $request->get_param( 'post_type' );
	$meta_key = $request->get_param( 'meta_key' );

	$cardinality = get_meta_cardinality( $meta_key, [ $post_type ] );

	return rest_ensure_response( [
		'cardinality' => $cardinality,
	] );
}

/**
 * REST API callback for getting meta values.
 *
 * @param \WP_REST_Request $request Request object.
 * @return \WP_REST_Response Response object.
 */
function rest_get_meta_values( \WP_REST_Request $request ) : \WP_REST_Response {
	$post_types = explode( ',', $request->get_param( 'post_type' ) );
	$meta_key = $request->get_param( 'meta_key' );

	$values = get_distinct_meta_values( $meta_key, $post_types );

	return rest_ensure_response( [
		'values' => $values,
	] );
}

/**
 * Get the cardinality (number of distinct values) for a meta key.
 *
 * @param string $meta_key   Meta key to check.
 * @param array  $post_types Post types to check.
 * @return int Number of distinct values.
 */
function get_meta_cardinality( string $meta_key, array $post_types ) : int {
	global $wpdb;

	$post_types_placeholder = implode( ',', array_fill( 0, count( $post_types ), '%s' ) );

	$query = $wpdb->prepare(
		"SELECT COUNT(DISTINCT pm.meta_value) as cardinality
		FROM {$wpdb->postmeta} pm
		INNER JOIN {$wpdb->posts} p ON pm.post_id = p.ID
		WHERE pm.meta_key = %s
		AND p.post_type IN ($post_types_placeholder)
		AND p.post_status = 'publish'",
		array_merge( [ $meta_key ], $post_types )
	);

	$result = $wpdb->get_var( $query );

	return (int) $result;
}

/**
 * Get distinct meta values for a meta key, with caching.
 *
 * @param string $meta_key   Meta key to get values for.
 * @param array  $post_types Post types to check.
 * @return array Array of distinct values.
 */
function get_distinct_meta_values( string $meta_key, array $post_types ) : array {
	$cache_key = 'query_filter_meta_' . md5( $meta_key . implode( '_', $post_types ) );
	$cached = get_transient( $cache_key );

	if ( false !== $cached ) {
		return $cached;
	}

	global $wpdb;

	$post_types_placeholder = implode( ',', array_fill( 0, count( $post_types ), '%s' ) );

	$query = $wpdb->prepare(
		"SELECT DISTINCT pm.meta_value
		FROM {$wpdb->postmeta} pm
		INNER JOIN {$wpdb->posts} p ON pm.post_id = p.ID
		WHERE pm.meta_key = %s
		AND p.post_type IN ($post_types_placeholder)
		AND p.post_status = 'publish'
		AND pm.meta_value != ''
		ORDER BY pm.meta_value ASC
		LIMIT 50",
		array_merge( [ $meta_key ], $post_types )
	);

	$results = $wpdb->get_col( $query );

	// Cache for 1 hour
	set_transient( $cache_key, $results, HOUR_IN_SECONDS );

	return $results;
}

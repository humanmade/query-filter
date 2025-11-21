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
	add_filter( 'the_posts', __NAMESPACE__ . '\\store_query_loop_posts', 10, 2 );
	add_filter( 'block_type_metadata', __NAMESPACE__ . '\\filter_block_type_metadata', 10 );
	add_action( 'init', __NAMESPACE__ . '\\register_blocks' );
	add_action( 'enqueue_block_assets', __NAMESPACE__ . '\\action_wp_enqueue_scripts' );

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
	register_block_type( ROOT_DIR . '/build/sort' );
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

	$current_query_identifier = $query->is_main_query() ? 'main' : (string) $query_id;
	$requested_query_id = sanitize_text_field(
		wp_unslash(
			$_GET['query-post_id']
				?? ( $_GET['query-id'] ?? '' )
		)
	);
	$legacy_prefix = $query->is_main_query() ? 'query-' : "query-{$query_id}-";
	$use_legacy_params = false;

	if ( 'main' !== $current_query_identifier && empty( $requested_query_id ) ) {
		foreach ( array_keys( $_GET ) as $key ) {
			if ( strpos( $key, $legacy_prefix ) === 0 ) {
				$use_legacy_params = true;
				break;
			}
		}
	}

	if ( ! $use_legacy_params ) {
		if ( 'main' !== $current_query_identifier && $requested_query_id !== $current_query_identifier ) {
			return;
		}

		if ( 'main' === $current_query_identifier && $requested_query_id && 'main' !== $requested_query_id ) {
			return;
		}
	}

	$tax_query = [];
	$valid_keys = [
		'post_type' => $query->is_search() ? 'any' : 'post',
		's' => '',
		'orderby' => '',
		'order' => '',
	];

	// Preserve valid params for later retrieval.
	foreach ( $valid_keys as $key => $default ) {
		$query->set(
			"query-filter-$key",
			$query->get( $key, $default )
		);
	}

	// Map get params to this query.
	if ( $use_legacy_params ) {
		foreach ( $_GET as $key => $value ) {
			if ( strpos( $key, $legacy_prefix ) !== 0 ) {
				continue;
			}

			$param = str_replace( $legacy_prefix, '', $key );
			$value = sanitize_text_field( urldecode( wp_unslash( $value ) ) );

			if ( 'page' === $param ) {
				$paged = max( 1, absint( $value ) );
				$query->set( 'paged', $paged );
				continue;
			}

			if ( 'post_orderby' === $param ) {
				$parts = explode( ':', $value );
				$orderby = sanitize_key( $parts[0] ?? '' );
				$order = strtoupper( sanitize_text_field( $parts[1] ?? '' ) );

				if ( ! empty( $orderby ) ) {
					$query->set( 'orderby', $orderby );
				}

				if ( in_array( $order, [ 'ASC', 'DESC' ], true ) ) {
					$query->set( 'order', $order );
				}

				continue;
			}

			if ( get_taxonomy( $param ) ) {
				$tax_query['relation'] = 'AND';
				$tax_query[] = [
					'taxonomy' => $param,
					'terms' => [ $value ],
					'field' => 'slug',
				];
				continue;
			}

			$param = sanitize_key( $param );

			if ( ! array_key_exists( $param, $valid_keys ) ) {
				continue;
			}

			$query->set(
				$param,
				$value
			);
		}
	} else {
		foreach ( $_GET as $key => $value ) {
			if ( strpos( $key, 'query-' ) !== 0 || in_array( $key, [ 'query-post_id', 'query-id' ], true ) ) {
				continue;
			}

			$value = sanitize_text_field( urldecode( wp_unslash( $value ) ) );
			$param = substr( $key, 6 );

			if ( 'page' === $param ) {
				$paged = max( 1, absint( $value ) );
				$query->set( 'paged', $paged );
				continue;
			}

			if ( get_taxonomy( $param ) ) {
				$tax_query['relation'] = 'AND';
				$tax_query[] = [
					'taxonomy' => $param,
					'terms' => [ $value ],
					'field' => 'slug',
				];
				continue;
			}

			if ( 'post_orderby' === $param ) {
				$parts = explode( ':', $value );
				$orderby = sanitize_key( $parts[0] ?? '' );
				$order = strtoupper( sanitize_text_field( $parts[1] ?? '' ) );

				if ( ! empty( $orderby ) ) {
					$query->set( 'orderby', $orderby );
				}

				if ( in_array( $order, [ 'ASC', 'DESC' ], true ) ) {
					$query->set( 'order', $order );
				}

				continue;
			}

			// Other options should map directly to query vars.
			$param = sanitize_key( $param );

			if ( ! array_key_exists( $param, $valid_keys ) ) {
				continue;
			}

			$query->set(
				$param,
				$value
			);
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

	$target_query_id = empty( $instance->context['query']['inherit'] )
		? (string) ( $instance->context['queryId'] ?? 0 )
		: 'main';
	$query_var = 'query-s';

	$action = remove_query_arg( [ $query_var, 'query-page', 'query-post_id', 'query-id' ] );
	if ( ! empty( $instance->context['query']['inherit'] ) ) {
		$current_paged = (int) get_query_var( 'paged', 1 );
		if ( $current_paged > 1 ) {
			$action = str_replace( '/page/' . $current_paged, '', $action );
		}
		$action = remove_query_arg( [ 'page' ], $action );
	}

	$action = add_query_arg(
		[
			'query-post_id' => $target_query_id,
			$query_var => '',
		],
		$action
	);

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
 * Cache the post IDs for each rendered query loop.
 *
 * @param array    $posts Array of post objects.
 * @param WP_Query $query Current WP_Query object.
 * @return array
 */
function store_query_loop_posts( array $posts, WP_Query $query ) : array {
	$query_id = $query->get( 'query_id', null );

	if ( is_null( $query_id ) ) {
		return $posts;
	}

	$cache = &query_loop_posts_cache();
	$cache[ $query_id ] = array_map( 'intval', wp_list_pluck( $posts, 'ID' ) );

	return $posts;
}

/**
 * Retrieve the post IDs associated with the provided block's query.
 *
 * @param \WP_Block $block Block instance.
 * @return array<int>
 */
function get_query_loop_post_ids_for_block( \WP_Block $block ) : array {
	if ( empty( $block->context['query'] ) ) {
		return [];
	}

	if ( ! empty( $block->context['query']['inherit'] ) ) {
		global $wp_query;

		return array_map( 'intval', wp_list_pluck( $wp_query->posts ?? [], 'ID' ) );
	}

	$query_id = $block->context['queryId'] ?? null;

	if ( is_null( $query_id ) ) {
		return [];
	}

	$cache = &query_loop_posts_cache();

	return $cache[ $query_id ] ?? [];
}

/**
 * Helper to store post IDs for each query loop.
 *
 * @return array<int, array<int>>
 */
function &query_loop_posts_cache() : array {
	if ( ! isset( $GLOBALS['hm_query_loop_filter_query_posts'] ) || ! is_array( $GLOBALS['hm_query_loop_filter_query_posts'] ) ) {
		$GLOBALS['hm_query_loop_filter_query_posts'] = [];
	}

	return $GLOBALS['hm_query_loop_filter_query_posts'];
}

/**
 * Ensure certain query parameters remain readable in URLs.
 *
 * @param string $url URL to normalize.
 * @return string
 */
function normalize_query_filter_url( string $url ) : string {
	if ( false === strpos( $url, 'query-post_orderby=' ) ) {
		return $url;
	}

	return preg_replace_callback(
		'/(query-post_orderby=)([^&#]+)/',
		static function ( $matches ) {
			return $matches[1] . rawurldecode( $matches[2] );
		},
		$url
	);
}

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
	add_action( 'template_redirect', __NAMESPACE__ . '\\maybe_redirect_taxonomy_query_page' );
	add_action( 'enqueue_block_editor_assets', __NAMESPACE__ . '\\enqueue_block_editor_assets' );
	add_filter( 'render_block', __NAMESPACE__ . '\\filter_inline_taxonomy_text_in_block', 10, 2 );
	add_filter( 'the_content', __NAMESPACE__ . '\\filter_inline_taxonomy_text_in_content', 12 );
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
 * Enqueue editor-only assets for block/format features.
 *
 * @return void
 */
function enqueue_block_editor_assets() : void {
	$asset_path = ROOT_DIR . '/build/taxonomy-text/index.asset.php';

	if ( ! file_exists( $asset_path ) ) {
		return;
	}

	$asset = include $asset_path;

	wp_enqueue_script(
		'query-filter-taxonomy-text',
		plugins_url( '/build/taxonomy-text/index.js', PLUGIN_FILE ),
		$asset['dependencies'],
		$asset['version'],
		true
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
	register_block_type( ROOT_DIR . '/build/taxonomy-text' );
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
	$page_param_handled = false;
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
				$page_param_handled = true;
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
				$page_param_handled = true;
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

	if ( ! $page_param_handled ) {
		$path_paged = (int) get_query_var( 'paged', 0 );

		if ( $path_paged > 1 ) {
			$should_use_path_paged = ( 'main' === $current_query_identifier );

			if ( ! $should_use_path_paged && ! $use_legacy_params ) {
				$should_use_path_paged = (string) $current_query_identifier === $requested_query_id;
			}

			if ( $should_use_path_paged && ! (int) $query->get( 'paged' ) ) {
				$query->set( 'paged', $path_paged );
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
	$block_content->set_attribute( 'data-wp-interactive', 'query-filter' );
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

/**
 * Redirect taxonomy pagination requests to pretty permalinks.
 *
 * @return void
 */
function maybe_redirect_taxonomy_query_page() : void {
	if ( is_admin() || wp_doing_ajax() ) {
		return;
	}

	if ( ! ( is_category() || is_tag() || is_tax() ) ) {
		return;
	}

	$page_param = null;

	if ( isset( $_GET['query-page'] ) ) {
		$page_param = 'query-page';
	} else {
		foreach ( array_keys( $_GET ) as $key ) {
			if ( preg_match( '/^query-\d+-page$/', $key ) ) {
				$page_param = $key;
				break;
			}
		}
	}

	if ( is_null( $page_param ) ) {
		return;
	}

	$page = max( 1, absint( wp_unslash( $_GET[ $page_param ] ) ) );

	if ( $page <= 1 ) {
		return;
	}

	$destination = get_pagenum_link( $page );

	if ( empty( $destination ) ) {
		return;
	}

	$params = [];

	foreach ( $_GET as $key => $value ) {
		if ( $key === $page_param || strpos( $key, 'query-' ) !== 0 ) {
			continue;
		}

		$params[ $key ] = sanitize_text_field( wp_unslash( $value ) );
	}

	if ( ! empty( $params ) ) {
		$destination = add_query_arg( $params, $destination );
	}

	wp_safe_redirect( $destination, 301 );
	exit;
}

/**
 * Build the rendered taxonomy text result for the block/format.
 *
 * @param array<string, mixed> $attributes Attributes.
 * @param array<string, mixed> $context    Block context.
 * @return array{ text: string, filter_type: string, url: string }|null
 */
function get_taxonomy_text_result( array $attributes, array $context = [] ) : ?array {
	$allowed_filters = [ 'tag', 'category', 'sort', 'yoast_primary_category', 'search' ];
	$filter_type     = $attributes['filterType'] ?? 'tag';
	$value_type      = $attributes['valueType'] ?? 'title';

	if ( ! in_array( $filter_type, $allowed_filters, true ) ) {
		$filter_type = 'tag';
	}

	if ( ! in_array( $value_type, [ 'title', 'description', 'page' ], true ) ) {
		$value_type = 'title';
	}

	$prefix        = (string) ( $attributes['prefix'] ?? '' );
	$suffix        = (string) ( $attributes['suffix'] ?? '' );
	$query_context = $context['query'] ?? [];
	$inherits_main = empty( $context ) || ! empty( $query_context['inherit'] );
	$target_query_id = $inherits_main ? 'main' : (string) ( $context['queryId'] ?? 0 );

	$requested_query_id = sanitize_text_field(
		wp_unslash(
			$_GET['query-post_id']
				?? ( $_GET['query-id'] ?? '' )
		)
	);

	$legacy_prefix     = 'main' === $target_query_id ? 'query-' : "query-{$target_query_id}-";
	$use_legacy_params = false;

	if ( 'main' !== $target_query_id && empty( $requested_query_id ) ) {
		foreach ( array_keys( $_GET ) as $key ) {
			if ( strpos( $key, $legacy_prefix ) === 0 ) {
				$use_legacy_params = true;
				break;
			}
		}
	}

	if ( ! $use_legacy_params ) {
		if ( 'main' !== $target_query_id && $requested_query_id !== $target_query_id ) {
			return null;
		}

		if ( 'main' === $target_query_id && $requested_query_id && 'main' !== $requested_query_id ) {
			return null;
		}
	}

	$param_suffix_map = [
		'tag'      => 'post_tag',
		'category' => 'category',
		'sort'     => 'post_orderby',
	];

	$show_after_first_page = isset( $attributes['showAfterFirstPage'] )
		? (bool) $attributes['showAfterFirstPage']
		: true;

	$display_value = '';
	$raw_value     = '';
	$url           = '';

	// Special-case: Yoast primary category, if available.
	if ( 'yoast_primary_category' === $filter_type ) {
		if ( ! class_exists( '\WPSEO_Primary_Term' ) ) {
			return null;
		}

		$post_id = $context['postId'] ?? get_the_ID();

		if ( ! $post_id ) {
			return null;
		}

		$primary = new \WPSEO_Primary_Term( 'category', $post_id );
		$term_id = $primary->get_primary_term();

		if ( ! $term_id || is_wp_error( $term_id ) ) {
			return null;
		}

		$term = get_term( (int) $term_id, 'category' );

		if ( ! $term || is_wp_error( $term ) ) {
			return null;
		}

		$title       = $term->name;
		$description = trim( wp_strip_all_tags( $term->description ?? '' ) );

		if ( 'description' === $value_type && '' !== $description ) {
			$display_value = $description;
		} else {
			$display_value = $title;
		}

		$term_link = get_term_link( $term );

		if ( ! is_wp_error( $term_link ) ) {
			$url = (string) $term_link;
		}
	} elseif ( 'search' === $filter_type ) {
		// Search term mode – extract from URL parameter 's'.
		$search_term = get_query_var( 's', '' );

		if ( empty( $search_term ) && isset( $_GET['s'] ) ) {
			$search_term = sanitize_text_field( wp_unslash( $_GET['s'] ) );
		}

		if ( empty( $search_term ) ) {
			return null;
		}

		// Decode URL-encoded search terms (e.g., "garden+tools" -> "garden tools").
		$display_value = urldecode( $search_term );
	} elseif ( 'page' === $value_type ) {
		// Page mode – just derive from pagination.
		$paged = 1;

		// Prefer explicit query-* page params for the targeted query.
		foreach ( array_keys( $_GET ) as $key ) {
			if ( 'main' === $target_query_id && 'query-page' === $key ) {
				$paged = max( 1, absint( wp_unslash( $_GET[ $key ] ) ) );
				break;
			}

			if (
				'main' !== $target_query_id
				&& preg_match( '/^query-(\d+)-page$/', $key, $matches )
				&& (string) $matches[1] === (string) $target_query_id
			) {
				$paged = max( 1, absint( wp_unslash( $_GET[ $key ] ) ) );
				break;
			}
		}

		if ( $paged <= 1 ) {
			$paged = (int) get_query_var( 'paged', 1 );
		}

		if ( $paged <= 1 && $show_after_first_page ) {
			return null;
		}

		$display_value = (string) max( 1, $paged );
	} else {
		// For tag, category and sort, resolve the raw query param value first.
		$param_candidates = array_unique(
			[
				'query-' . $param_suffix_map[ $filter_type ],
				$legacy_prefix . $param_suffix_map[ $filter_type ],
			]
		);

		foreach ( $param_candidates as $param_name ) {
			if ( isset( $_GET[ $param_name ] ) && '' !== $_GET[ $param_name ] ) {
				$raw_value = sanitize_text_field( urldecode( wp_unslash( $_GET[ $param_name ] ) ) );
				break;
			}
		}

		if ( '' === $raw_value ) {
			return null;
		}

		if ( 'sort' === $filter_type ) {
			$sort_labels = [
				'date:DESC'          => __( 'Newest to Oldest', 'query-filter' ),
				'date:ASC'           => __( 'Oldest to Newest', 'query-filter' ),
				'title:ASC'          => __( 'A → Z', 'query-filter' ),
				'title:DESC'         => __( 'Z → A', 'query-filter' ),
				'comment_count:DESC' => __( 'Most Commented', 'query-filter' ),
				'menu_order:ASC'     => __( 'Menu Order', 'query-filter' ),
			];

			$parts      = explode( ':', $raw_value );
			$orderby    = sanitize_key( $parts[0] ?? '' );
			$order      = strtoupper( sanitize_text_field( $parts[1] ?? '' ) );
			$normalized = $orderby . ':' . $order;

			if ( isset( $sort_labels[ $normalized ] ) ) {
				$display_value = $sort_labels[ $normalized ];
			}

			// Ensure we never try to look up a "description" label for sort.
			if ( 'description' === $value_type ) {
				$value_type = 'title';
			}
		} else {
			$taxonomy = 'tag' === $filter_type ? 'post_tag' : 'category';

			$raw_slugs = array_filter(
				array_map(
					'trim',
					explode( ',', $raw_value )
				)
			);

			$slugs = array_values(
				array_filter(
					array_map(
						static function ( $slug ) {
							$sanitized = sanitize_title( $slug );

							return '' === $sanitized ? null : $sanitized;
						},
						$raw_slugs
					)
				)
			);

			if ( empty( $slugs ) ) {
				return null;
			}

			$terms = get_terms(
				[
					'taxonomy'   => $taxonomy,
					'slug'       => $slugs,
					'hide_empty' => false,
				]
			);

			if ( is_wp_error( $terms ) || empty( $terms ) ) {
				return null;
			}

			$term_lookup = [];

			foreach ( $terms as $term ) {
				$term_lookup[ $term->slug ] = [
					'title'       => $term->name,
					'description' => trim( wp_strip_all_tags( $term->description ?? '' ) ),
				];
			}

			$ordered_values = [];
			$value_key      = 'description' === $value_type ? 'description' : 'title';

			foreach ( $slugs as $slug ) {
				if ( isset( $term_lookup[ $slug ][ $value_key ] ) && '' !== $term_lookup[ $slug ][ $value_key ] ) {
					$ordered_values[] = $term_lookup[ $slug ][ $value_key ];
				}
			}

			if ( empty( $ordered_values ) ) {
				return null;
			}

			$display_value = implode( ', ', $ordered_values );
		}
	}

	if ( '' === $display_value ) {
		return null;
	}

	$text = $prefix . $display_value . $suffix;

	if ( '' === trim( $text ) ) {
		return null;
	}

	return [
		'text'        => $text,
		'filter_type' => $filter_type,
		'url'         => $url,
	];
}

/**
 * Replace inline taxonomy spans in rendered content.
 *
 * @param string               $content Content string.
 * @param array<string, mixed> $context Block context.
 * @return string
 */
function replace_inline_taxonomy_text_spans( string $content, array $context = [] ) : string {
	if ( false === strpos( $content, 'data-query-filter-text=' ) ) {
		return $content;
	}

	$pattern = '/<span\b([^>]*)data-query-filter-text="([^"]+)"([^>]*)>(.*?)<\/span>/si';

	return preg_replace_callback(
		$pattern,
		static function ( $matches ) use ( $context ) {
			$decoded = html_entity_decode( $matches[2], ENT_QUOTES, 'UTF-8' );
			$attributes = json_decode( $decoded, true );

			if ( ! is_array( $attributes ) ) {
				return $matches[0];
			}

			$result = get_taxonomy_text_result( $attributes, $context );

			if ( is_null( $result ) ) {
				return '';
			}

			$class = sprintf(
				'taxonomy-text taxonomy-text--%s',
				sanitize_html_class( $result['filter_type'] )
			);

			$link_url = ( ! empty( $attributes['link'] ) && ! empty( $result['url'] ) )
				? $result['url']
				: '';

			$text_html = esc_html( $result['text'] );

			if ( $link_url ) {
				$text_html = sprintf(
					'<a href="%s">%s</a>',
					esc_url( $link_url ),
					$text_html
				);
			}

			return sprintf(
				'<span class="%s">%s</span>',
				esc_attr( $class ),
				$text_html
			);
		},
		$content
	);
}

/**
 * Filter the rendered block content to inject inline taxonomy text.
 *
 * @param string $block_content Block HTML.
 * @param array  $block         Parsed block data.
 * @return string
 */
function filter_inline_taxonomy_text_in_block( string $block_content, array $block ) : string {
	if ( false === strpos( $block_content, 'data-query-filter-text=' ) ) {
		return $block_content;
	}

	return replace_inline_taxonomy_text_spans( $block_content, $block['context'] ?? [] );
}

/**
 * Fallback for legacy content where render_block is not invoked.
 *
 * @param string $content Post content.
 * @return string
 */
function filter_inline_taxonomy_text_in_content( string $content ) : string {
	return replace_inline_taxonomy_text_spans( $content );
}

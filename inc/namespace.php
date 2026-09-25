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
 * Query var naming a taxonomy whose filter a query should leave out.
 *
 * Set on the queries that count a taxonomy filter's terms, which must narrow the posts by
 * every filter except their own.
 */
const SKIP_TAXONOMY_VAR = 'query-filter-skip-taxonomy';

/**
 * Object cache group for term counts.
 */
const CACHE_GROUP = 'query-filter';

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

	// Search.
	add_filter( 'render_block_core/search', __NAMESPACE__ . '\\render_block_search', 10, 3 );

	// Query.
	add_filter( 'render_block_core/query', __NAMESPACE__ . '\\render_block_query', 10, 3 );
}

/**
 * Fires after WordPress has finished loading but before any headers are sent.
 *
 */
function register_blocks() : void {
	register_block_type( ROOT_DIR . '/build/taxonomy' );
	register_block_type( ROOT_DIR . '/build/post-type' );
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
 * @param WP_Query $query The WP_Query instance (passed by reference).
 */
function pre_get_posts_transpose_query_vars( WP_Query $query ) : void {
	$query_id = $query->get( 'query_id', null );

	if ( ! $query->is_main_query() && is_null( $query_id ) ) {
		return;
	}

	$prefix = $query->is_main_query() ? 'query-' : "query-{$query_id}-";
	$skip_taxonomy = (string) $query->get( SKIP_TAXONOMY_VAR );
	$tax_query = [];
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
		if ( strpos( $key, $prefix ) !== 0 ) {
			continue;
		}

		$key = str_replace( $prefix, '', $key );

		// Only scalar values are ever produced by the filter blocks. Array
		// values (`?query-post_type[]=x`) would sanitize to an empty string.
		if ( ! is_scalar( $value ) ) {
			continue;
		}

		$value = sanitize_text_field( urldecode( wp_unslash( $value ) ) );

		// Handle taxonomies specifically.
		if ( taxonomy_exists( $key ) ) {
			// A visitor can name any registered taxonomy here, including ones
			// registered privately for internal bookkeeping. Filtering by those
			// turns the front end into an oracle for private groupings, so only
			// honour taxonomies that are publicly queryable in the first place.
			if ( ! is_taxonomy_viewable( $key ) || $key === $skip_taxonomy ) {
				continue;
			}

			// If multiple taxonomy filters are selected, ALL of them must match.
			$tax_query['relation'] = 'AND';

			// Handle multiple values separated by commas (for checkbox mode)
			$values = wp_parse_list( $value );

			// Clauses are keyed by taxonomy, so a term count can find and drop the
			// filter's own clause from the query it counts within.
			if ( count( $values ) > 1 ) {
				// If multiple terms in a taxonomy are selected, posts with
				// ANY of the selected terms should be returned.
				$tax_query[ get_clause_key( $key ) ] = [
					'taxonomy' => $key,
					'terms' => $values,
					'field' => 'slug',
					'operator' => 'IN',
				];
			} else {
				// Single value: normal behavior
				$tax_query[ get_clause_key( $key ) ] = [
					'taxonomy' => $key,
					'terms' => $values,
					'field' => 'slug',
				];
			}

			continue;
		}

		// Other options should map directly to query vars.
		$key = sanitize_key( $key );

		if ( ! in_array( $key, array_keys( $valid_keys ), true ) ) {
			continue;
		}

		// post_type accepts multiple comma-separated values in checkbox mode.
		// Parse as list so WP_Query returns results from any selected post_type.
		if ( $key === 'post_type' ) {
			// Same reasoning as taxonomies, with sharper teeth: an unfiltered
			// post_type lets a visitor swap the loop onto any registered post
			// type, including private ones holding unpublished editorial or
			// plugin data, and read their titles and excerpts straight out of
			// the loop. Keep only post types that are publicly queryable.
			$value = array_values( array_filter( wp_parse_list( $value ), 'is_post_type_viewable' ) );

			// Everything requested was unknown or non-public. Leave the query's
			// own post type in place rather than setting an empty one.
			if ( empty( $value ) ) {
				continue;
			}
		}

		$query->set(
			$key,
			$value
		);
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
 * Resolve the terms a taxonomy filter block should offer.
 *
 * Two modes, selected by whether `includeTerms` is populated:
 *
 * - Curated: render exactly the listed terms, in the order given. Empty terms
 *   are kept, because naming a term explicitly is unambiguous intent.
 * - Derived: render every term with posts, minus `excludeTerms`.
 *
 * Terms are addressed by slug rather than ID so that curated lists stay
 * readable and reviewable in pattern markup.
 *
 * @param array      $attributes Taxonomy filter block attributes.
 * @param int[]|null $term_ids   In derived mode, the only terms to consider: those with
 *                               results in the filter's query. Null to consider all.
 * @return \WP_Term[] Terms to render, in display order.
 */
function get_filter_terms( array $attributes, ?array $term_ids = null ) : array {
	$include = array_filter( (array) ( $attributes['includeTerms'] ?? [] ) );
	$exclude = array_filter( (array) ( $attributes['excludeTerms'] ?? [] ) );

	// Non-ASCII slugs are stored URL-encoded but are authored raw. Query for both forms.
	$include_slugs = ! empty( $include )
		? array_values( array_unique( array_merge( $include, array_map( 'rawurlencode', $include ) ) ) )
		: '';

	// In derived mode a filter can be limited to terms already known to have results in
	// its query, which then decides emptiness itself: the stored counts can lag behind
	// the posts, and looking the terms up by ID keeps the lookup's cap from dropping any
	// of them in favour of empty ones earlier in the alphabet.
	$by_id = empty( $include ) && null !== $term_ids;

	if ( $by_id && empty( $term_ids ) ) {
		return [];
	}

	$terms = get_terms( [
		'taxonomy' => $attributes['taxonomy'],
		'hide_empty' => empty( $include ) && ! $by_id,
		'slug' => $include_slugs,
		'include' => $by_id ? array_map( 'intval', $term_ids ) : [],
		'number' => 100,
	] );

	if ( is_wp_error( $terms ) || empty( $terms ) ) {
		return [];
	}

	if ( ! empty( $include ) ) {
		// get_terms() ignores the order of a slug list, but a curated row is an
		// editorial statement about prominence. Restore the authored order.
		usort(
			$terms,
			fn ( $a, $b ) => array_search( urldecode( $a->slug ), $include, true ) <=> array_search( urldecode( $b->slug ), $include, true )
		);

		return $terms;
	}

	if ( ! empty( $exclude ) ) {
		$terms = array_values( array_filter(
			$terms,
			fn ( $term ) => ! in_array( urldecode( $term->slug ), $exclude, true )
		) );
	}

	return $terms;
}

/**
 * Key the transposed tax query gives a taxonomy filter's clause.
 *
 * @param string $taxonomy Taxonomy name.
 * @return string Clause key.
 */
function get_clause_key( string $taxonomy ) : string {
	return 'query-filter-' . $taxonomy;
}

/**
 * Count the posts each term of a taxonomy filter would match in the current query.
 *
 * The count is taken within the posts the filter's query returns, narrowed by every
 * other filter but not by this one: selections within a taxonomy combine with OR, so a
 * term's count is what selecting it would add, not what it shares with the selection
 * already made. A parent term counts its descendants' posts too, as selecting it would.
 *
 * Counts are cached against the query and the site's last content change, so an edit to
 * any post or term makes them stale at once. Only anonymous visitors share them: results,
 * and so counts, can include private posts for a signed-in user, who may read them, and
 * their own. The `query_filter_term_counts` filter can supply counts from elsewhere, such
 * as a search index's aggregations.
 *
 * @param \WP_Block $block    Taxonomy filter block, carrying its query context.
 * @param string    $taxonomy Taxonomy name.
 * @return int[]|null Counts keyed by term ID, or null when the query cannot be resolved.
 */
function get_filter_term_counts( \WP_Block $block, string $taxonomy ) : ?array {
	$query_vars = get_count_query_vars( $block, $taxonomy );

	if ( null === $query_vars ) {
		return null;
	}

	/**
	 * Filters a taxonomy filter's term counts before they are calculated.
	 *
	 * Return an array of counts keyed by term ID to use them instead.
	 *
	 * @param int[]|null $counts     Counts, or null to calculate them.
	 * @param array      $query_vars Query the terms are counted within.
	 * @param string     $taxonomy   Taxonomy name.
	 * @param \WP_Block  $block      Taxonomy filter block.
	 */
	$counts = apply_filters( 'query_filter_term_counts', null, $query_vars, $taxonomy, $block );

	if ( is_array( $counts ) ) {
		return array_map( 'intval', $counts );
	}

	if ( is_user_logged_in() ) {
		return count_terms_in_query( $query_vars, $taxonomy );
	}

	$cache_key = sprintf(
		'term-counts:%s:%s:%s',
		md5( wp_json_encode( [ $query_vars, $taxonomy ] ) ),
		wp_cache_get_last_changed( 'posts' ),
		wp_cache_get_last_changed( 'terms' )
	);

	$counts = wp_cache_get( $cache_key, CACHE_GROUP );

	if ( ! is_array( $counts ) ) {
		$counts = count_terms_in_query( $query_vars, $taxonomy );
		wp_cache_set( $cache_key, $counts, CACHE_GROUP, DAY_IN_SECONDS );
	}

	return $counts;
}

/**
 * Build the query a taxonomy filter's terms are counted within.
 *
 * For an inherited loop that is the main query as it ran, with the filter's own clause
 * taken out of its tax query. For a loop of its own, it is the loop's query rebuilt from
 * the block context, which the filters are applied to again as it runs, less this one.
 * Either way it selects the IDs of every matching post, unordered: it becomes a subquery
 * of the count, and is not run on its own.
 *
 * @param \WP_Block $block    Taxonomy filter block, carrying its query context.
 * @param string    $taxonomy Taxonomy name.
 * @return array|null Query vars, or null when the query cannot be resolved.
 */
function get_count_query_vars( \WP_Block $block, string $taxonomy ) : ?array {
	if ( ! empty( $block->context['query']['inherit'] ) ) {
		global $wp_query;

		if ( ! $wp_query instanceof WP_Query ) {
			return null;
		}

		$query_vars = $wp_query->query_vars;

		// Once it has run, WP_Query writes the first term it queried back into these vars
		// for code that still reads them. Copied into another query they become a clause
		// of their own, narrowing every count to that one term, so they are left out
		// unless the request itself asked for them.
		foreach ( [ 'taxonomy', 'term', 'term_id', 'cat', 'category_name', 'tag_id' ] as $var ) {
			if ( ! isset( $wp_query->query[ $var ] ) ) {
				unset( $query_vars[ $var ] );
			}
		}

		if ( ! empty( $query_vars['tax_query'] ) && is_array( $query_vars['tax_query'] ) ) {
			$query_vars['tax_query'] = remove_tax_clause( $query_vars['tax_query'], get_clause_key( $taxonomy ) );
		}
	} elseif ( isset( $block->context['query'] ) ) {
		$query_vars = build_query_vars_from_query_block( $block, 1 );

		/** This filter is documented in wp-includes/blocks.php */
		$query_vars = apply_filters( 'query_loop_block_query_vars', $query_vars, $block, 1 );
		$query_vars[ SKIP_TAXONOMY_VAR ] = $taxonomy;
	} else {
		return null;
	}

	return array_merge( $query_vars, [
		'fields' => 'ids',
		'posts_per_page' => -1,
		'nopaging' => true,
		'paged' => 0,
		'offset' => 0,
		'orderby' => 'none',
		'no_found_rows' => true,
		'ignore_sticky_posts' => true,
		'cache_results' => false,
		'update_post_meta_cache' => false,
		'update_post_term_cache' => false,
	] );
}

/**
 * Remove a keyed clause from a tax query, at whatever depth it was nested.
 *
 * @param array  $tax_query Tax query.
 * @param string $key       Clause key.
 * @return array Tax query without the clause.
 */
function remove_tax_clause( array $tax_query, string $key ) : array {
	unset( $tax_query[ $key ] );

	foreach ( $tax_query as $index => $clause ) {
		if ( is_array( $clause ) && ! isset( $clause['taxonomy'] ) ) {
			$tax_query[ $index ] = remove_tax_clause( $clause, $key );
		}
	}

	return $tax_query;
}

/**
 * Count the posts a query returns for each term of a taxonomy.
 *
 * The query is never run as such: its SQL is nested in a grouped count, so however many
 * posts match, none of their IDs come back to PHP, and the database returns one row per
 * term. A parent's count is of the distinct posts across its whole branch, which cannot
 * be summed from its children's, so a hierarchical taxonomy's parents are counted in a
 * second query against a map of the branches beneath them.
 *
 * @param array  $query_vars Query to count within.
 * @param string $taxonomy   Taxonomy name.
 * @return int[] Counts keyed by term ID; terms with no posts are absent.
 */
function count_terms_in_query( array $query_vars, string $taxonomy ) : array {
	global $wpdb;

	$posts_sql = get_query_sql( $query_vars );

	if ( '' === $posts_sql ) {
		return [];
	}

	// Only the taxonomy is prepared: the posts subquery was assembled and escaped by
	// WP_Query, and preparing it again would mangle the escaped patterns of a search.
	$where = $wpdb->prepare( 'WHERE tt.taxonomy = %s AND tr.object_id IN ( ', $taxonomy ) . $posts_sql . ' )';
	$assigned = "{$wpdb->term_relationships} tr INNER JOIN {$wpdb->term_taxonomy} tt ON tt.term_taxonomy_id = tr.term_taxonomy_id";

	// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.DirectDatabaseQuery -- Prepared above; the tally is cached by the caller.
	$rows = $wpdb->get_results( "SELECT tt.term_id, COUNT( DISTINCT tr.object_id ) AS posts FROM {$assigned} {$where} GROUP BY tt.term_id" );

	$counts = [];

	foreach ( $rows as $row ) {
		$counts[ (int) $row->term_id ] = (int) $row->posts;
	}

	$branches = get_term_branches( $taxonomy );

	if ( empty( $counts ) || empty( $branches ) ) {
		return $counts;
	}

	$map = implode( ' UNION ALL ', array_map(
		fn ( array $pair ) => sprintf( 'SELECT %d AS ancestor_id, %d AS term_id', $pair[0], $pair[1] ),
		$branches
	) );

	// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.DirectDatabaseQuery -- The map is built from integers; the rest is prepared above.
	$rows = $wpdb->get_results( "SELECT branch.ancestor_id, COUNT( DISTINCT tr.object_id ) AS posts FROM {$assigned} INNER JOIN ( {$map} ) AS branch ON branch.term_id = tt.term_id {$where} GROUP BY branch.ancestor_id" );

	foreach ( $rows as $row ) {
		$counts[ (int) $row->ancestor_id ] = (int) $row->posts;
	}

	return $counts;
}

/**
 * Build the SQL a query would run, without running it.
 *
 * The query goes through WP_Query as any other would, so every filter on its vars and
 * clauses applies, and is stopped just before it reaches the database.
 *
 * @param array $query_vars Query vars.
 * @return string SQL selecting the matching post IDs, or an empty string.
 */
function get_query_sql( array $query_vars ) : string {
	$query = new WP_Query();

	$short_circuit = fn ( $posts, WP_Query $running ) => $running === $query ? [] : $posts;

	add_filter( 'posts_pre_query', $short_circuit, PHP_INT_MAX, 2 );
	$query->query( $query_vars );
	remove_filter( 'posts_pre_query', $short_circuit, PHP_INT_MAX );

	return (string) $query->request;
}

/**
 * Pair each parent term with every term in its branch, itself included.
 *
 * @param string $taxonomy Taxonomy name.
 * @return int[][] Pairs of `[ ancestor term ID, term ID ]`; empty for a flat taxonomy.
 */
function get_term_branches( string $taxonomy ) : array {
	if ( ! is_taxonomy_hierarchical( $taxonomy ) ) {
		return [];
	}

	$parents = get_terms( [
		'taxonomy' => $taxonomy,
		'hide_empty' => false,
		'fields' => 'id=>parent',
	] );

	if ( is_wp_error( $parents ) ) {
		return [];
	}

	$pairs = [];

	foreach ( array_unique( array_filter( array_map( 'intval', $parents ) ) ) as $ancestor_id ) {
		$descendants = get_term_children( $ancestor_id, $taxonomy );

		foreach ( array_merge( [ $ancestor_id ], is_wp_error( $descendants ) ? [] : $descendants ) as $term_id ) {
			$pairs[] = [ $ancestor_id, (int) $term_id ];
		}
	}

	return $pairs;
}

/**
 * Resolve the hierarchy mode a taxonomy filter block should render with.
 *
 * If the saved attribute is incompatible with the taxonomy type (a flat
 * taxonomy has no tree view, and a select control has no rows to collapse)
 * the value falls back to the nearest relevant mode.
 *
 * @param array  $attributes Taxonomy filter block attributes.
 * @param string $taxonomy   Taxonomy name.
 * @return string One of `flat`, `nested` or `collapsed`.
 */
function get_hierarchy_mode( array $attributes, string $taxonomy ) : string {
	$mode = $attributes['hierarchy'] ?? 'flat';

	if ( ! in_array( $mode, [ 'flat', 'nested', 'collapsed' ], true ) ) {
		return 'flat';
	}

	if ( $mode !== 'flat' && ! is_taxonomy_hierarchical( $taxonomy ) ) {
		return 'flat';
	}

	if ( $mode === 'collapsed' && ( $attributes['displayType'] ?? 'select' ) === 'select' ) {
		return 'nested';
	}

	return $mode;
}

/**
 * Nest a flat list of terms by parent.
 *
 * Each node is `[ 'term' => WP_Term, 'children' => array ]`, so that a term
 * object is never given ad hoc properties. A term whose parent is not in the
 * list is promoted to a root, which keeps a curated or filtered list whole
 * instead of silently dropping the branches whose parents were left out.
 * Sibling order follows the order of the input.
 *
 * @param \WP_Term[] $terms Terms to nest.
 * @return array[] Root nodes, each carrying its descendants.
 */
function build_term_tree( array $terms ) : array {
	$ids = array_column( $terms, 'term_id' );
	$children_of = [];

	foreach ( $terms as $term ) {
		$parent = in_array( $term->parent, $ids, true ) ? $term->parent : 0;
		$children_of[ $parent ][] = $term;
	}

	$build = function ( int $parent_id ) use ( &$build, $children_of ) : array {
		return array_map(
			fn ( \WP_Term $term ) => [
				'term' => $term,
				'children' => $build( $term->term_id ),
			],
			$children_of[ $parent_id ] ?? []
		);
	};

	return $build( 0 );
}

/**
 * Flatten a term tree back into depth-first order, recording each depth.
 *
 * Used where nested markup is not possible, such as `<option>` elements, so
 * the tree can still be conveyed by indentation.
 *
 * @param array[] $tree  Nodes as returned by build_term_tree().
 * @param int     $depth Depth of the nodes passed, zero for roots.
 * @return array[] Rows of `[ 'term' => WP_Term, 'depth' => int ]`.
 */
function flatten_term_tree( array $tree, int $depth = 0 ) : array {
	$rows = [];

	foreach ( $tree as $node ) {
		$rows[] = [
			'term' => $node['term'],
			'depth' => $depth,
		];
		$rows = array_merge( $rows, flatten_term_tree( $node['children'], $depth + 1 ) );
	}

	return $rows;
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
 * Sanitize a search query value.
 *
 * sanitize_text_field() trims surrounding whitespace. We want to preserve that
 * so that the rendered value always matches what a user is typing, such as when
 * they are typing a space between words. Restore outer whitespace after sanitizing.
 *
 * @param string $query_var Name of query var to capture and sanitize.
 * @return string Sanitized value with leading/trailing whitespace preserved.
 */
function sanitize_search_query_var( string $query_var ) : string {
	if ( ! isset( $_GET[ $query_var ] ) ) {
		return '';
	}

	// phpcs:ignore HM.Security.ValidatedSanitizedInput.InputNotSanitized -- Intermediate reference to capture whitespace only, sanitized below.
	$value = wp_unslash( $_GET[ $query_var ] );

	if ( $value === '' ) {
		return '';
	}

	$sanitized = sanitize_text_field( $value );

	// Capture surrounding whitespace.
	preg_match( '/^\s*/', $value, $leading );
	preg_match( '/\s*$/', $value, $trailing );

	// If sanitization removed all content, leading and trailing space may be
	// the same characters. Only return the trailing space, to avoid doubling.
	if ( $sanitized === '' && ( $leading[0] === $trailing[0] ) ) {
		return $trailing[0];
	}

	return $leading[0] . $sanitized . $trailing[0];
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

	$inherit = ! empty( $instance->context['query']['inherit'] );

	// An inherited query is the main query, and WordPress resolves that from
	// its own `s`: a term only reaches the search template because `s` is what
	// routing reads. Naming the field anything else leaves the field blank on
	// arrival, and clearing it deletes a parameter the URL never carried, so
	// the results never change. `query-s` is still transposed onto the main
	// query for anything that already links to it.
	$query_var = $inherit
		? 's'
		: sprintf( 'query-%d-s', $instance->context['queryId'] ?? 0 );

	// A search is a new set of results, so it belongs on the first page. Left
	// in place, the page the visitor happened to be on is carried into the
	// search and a term with fewer pages of matches than that renders empty.
	// Named as core names it, so the parameter the pagination block wrote is
	// the one that gets dropped.
	$page_var = $inherit
		? 'page'
		: ( isset( $instance->context['queryId'] ) ? 'query-' . $instance->context['queryId'] . '-page' : 'query-page' );

	$action = remove_query_arg( $page_var, add_query_arg( [ $query_var => '' ] ) );
	$action = str_replace( '/page/' . get_query_var( 'paged', 1 ), '', $action );

	$search_value = sanitize_search_query_var( $query_var );

	$block_content = new WP_HTML_Tag_Processor( $block_content );
	$block_content->next_tag( [ 'tag_name' => 'form' ] );
	$block_content->set_attribute( 'action', $action );
	$block_content->set_attribute( 'data-wp-interactive', 'query-filter' );
	$block_content->set_attribute( 'data-wp-on--submit', 'actions.search' );
	// Scope search to block context so multiple searchable query loops may coexist.
	$block_content->set_attribute( 'data-wp-context', wp_json_encode( [ 'searchValue' => $search_value ] ) );
	$block_content->next_tag( [ 'tag_name' => 'input', 'class_name' => 'wp-block-search__input' ] );
	$block_content->set_attribute( 'name', $query_var );
	$block_content->set_attribute( 'inputmode', 'search' );
	$block_content->set_attribute( 'value', $search_value );
	$block_content->set_attribute( 'data-wp-bind--value', 'context.searchValue' );
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

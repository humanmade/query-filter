<?php
/**
 * Custom fields search functionality.
 *
 * @package query-filter
 */

namespace HM\Query_Loop_Filter;

use WP_Query;

/**
 * Check if the current query is a search query.
 *
 * @param WP_Query|null $query The query object.
 * @return bool Whether this is a search query.
 */
function is_custom_search( $query = null ) {
	if ( ! $query ) {
		global $wp_query;
		$query = $wp_query;
	}

	// Check if it's a standard search
	if ( is_search() ) {
		return true;
	}

	// Check if it's a query loop with search parameter
	if ( $query && ! empty( $query->query_vars['s'] ) ) {
		return true;
	}

	return false;
}

/**
 * Join posts and postmeta tables for custom field search.
 *
 * @param string   $join  The JOIN clause of the query.
 * @param WP_Query $query The WP_Query instance.
 * @return string The modified JOIN clause.
 */
function cf_search_join( $join, $query = null ) {
	global $wpdb;

	if ( is_custom_search( $query ) ) {
		$join .= ' LEFT JOIN ' . $wpdb->postmeta . ' ON ' . $wpdb->posts . '.ID = ' . $wpdb->postmeta . '.post_id ';
	}

	return $join;
}

/**
 * Modify the search query with posts_where to include custom fields.
 *
 * @param string   $where The WHERE clause of the query.
 * @param WP_Query $query The WP_Query instance.
 * @return string The modified WHERE clause.
 */
function cf_search_where( $where, $query = null ) {
	global $wpdb;

	if ( is_custom_search( $query ) ) {
		$where = preg_replace(
			"/\(\s*" . $wpdb->posts . ".post_title\s+LIKE\s*(\'[^\']+\')\s*\)/",
			"(" . $wpdb->posts . ".post_title LIKE $1) OR (" . $wpdb->postmeta . ".meta_value LIKE $1)",
			$where
		);
	}

	return $where;
}

/**
 * Prevent duplicates in search results.
 *
 * @param string   $where The DISTINCT clause of the query.
 * @param WP_Query $query The WP_Query instance.
 * @return string The modified DISTINCT clause.
 */
function cf_search_distinct( $where, $query = null ) {
	if ( is_custom_search( $query ) ) {
		return "DISTINCT";
	}

	return $where;
}

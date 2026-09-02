<?php
/**
 * Registers the post types and taxonomies the end-to-end tests filter against.
 *
 * Loaded as an mu-plugin by the Playground blueprint. The private registrations
 * exist so the tests can prove that a visitor naming them in the query string
 * gets nothing back.
 *
 * @package query-filter
 */

namespace HM\Query_Loop_Filter\Tests;

add_action( 'init', __NAMESPACE__ . '\\register_test_content' );
add_filter( 'get_block_templates', __NAMESPACE__ . '\\replace_search_template', 10, 2 );

/**
 * Register the test post types and taxonomies.
 *
 * @return void
 */
function register_test_content() : void {
	// A second public post type, so a post type filter has something to switch to.
	register_post_type( 'qf_doc', [
		'label' => 'Docs',
		'public' => true,
		'publicly_queryable' => true,
		'show_in_rest' => true,
		'has_archive' => true,
		'supports' => [ 'title', 'editor', 'excerpt' ],
	] );

	// Private post type. Nothing on the front end may ever surface these,
	// however the query string asks.
	register_post_type( 'qf_secret', [
		'label' => 'Secrets',
		'public' => false,
		'publicly_queryable' => false,
		'show_in_rest' => false,
		'supports' => [ 'title', 'editor' ],
	] );

	// Private taxonomy, for the same reason.
	register_taxonomy( 'qf_hidden', [ 'post' ], [
		'label' => 'Hidden',
		'public' => false,
		'publicly_queryable' => false,
		'show_in_rest' => false,
		'hierarchical' => false,
	] );
}

/**
 * Put a searchable, inheriting query loop on the search results template.
 *
 * The bundled themes render search results through a query loop that inherits
 * the main query, but none of them place a search block inside it. That is the
 * arrangement a dedicated search page uses, and the only one where the filter
 * blocks see an inherited query, so the tests need a template that has it.
 *
 * @param \WP_Block_Template[] $templates Templates matching the query.
 * @param array               $query     Arguments the templates were queried with.
 * @return \WP_Block_Template[] Templates, with the search template rewritten.
 */
function replace_search_template( array $templates, array $query ) : array {
	if ( ! in_array( 'search', (array) ( $query['slug__in'] ?? [] ), true ) ) {
		return $templates;
	}

	foreach ( $templates as $template ) {
		if ( $template->slug !== 'search' ) {
			continue;
		}

		$template->content = implode( '', [
			'<!-- wp:query-title {"type":"search"} /-->',
			'<!-- wp:query {"queryId":6,"query":{"perPage":10,"pages":0,"offset":0,"postType":"post","order":"asc","orderBy":"title","inherit":true}} -->',
			'<div class="wp-block-query">',
			'<!-- wp:search {"buttonText":"Search"} /-->',
			'<!-- wp:post-template --><!-- wp:post-title /--><!-- /wp:post-template -->',
			'</div>',
			'<!-- /wp:query -->',
		] );
	}

	return $templates;
}

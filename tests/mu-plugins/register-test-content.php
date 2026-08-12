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

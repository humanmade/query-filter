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

/**
 * PHP notices raised from inside this plugin during the current request.
 *
 * @var string[]
 */
$GLOBALS['query_filter_php_errors'] = [];

set_error_handler( __NAMESPACE__ . '\\record_plugin_php_error', E_ALL );
add_action( 'wp_footer', __NAMESPACE__ . '\\print_plugin_php_errors', 1000 );

/**
 * Record diagnostics raised from this plugin's own files.
 *
 * A PHP warning only reaches the response when the server is configured to
 * display errors, which is not something a test can rely on. Collecting them
 * here instead means a spec can assert that a page rendered cleanly whatever
 * the environment does with `display_errors`.
 *
 * Returns false so PHP's own handler still runs and the debug log is unchanged.
 *
 * @param int    $errno   Level of the error raised.
 * @param string $errstr  Error message.
 * @param string $errfile File the error was raised in.
 * @param int    $errline Line the error was raised on.
 * @return bool False, so the standard error handler also runs.
 */
function record_plugin_php_error( int $errno, string $errstr, string $errfile = '', int $errline = 0 ) : bool {
	if ( strpos( $errfile, '/query-filter/' ) !== false ) {
		$GLOBALS['query_filter_php_errors'][] = sprintf(
			'%s in %s:%d',
			$errstr,
			basename( dirname( $errfile ) ) . '/' . basename( $errfile ),
			$errline
		);
	}

	return false;
}

/**
 * Print the recorded notices, and a marker proving the handler was installed.
 *
 * @return void
 */
function print_plugin_php_errors() : void {
	foreach ( array_unique( $GLOBALS['query_filter_php_errors'] ) as $error ) {
		printf( "<!-- qf-php-error: %s -->\n", esc_html( $error ) );
	}

	echo "<!-- qf-php-errors-checked -->\n";
}

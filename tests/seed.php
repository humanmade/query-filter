<?php
/**
 * Seeds the fixture content the end-to-end tests assert against.
 *
 * Run once by the Playground blueprint, after wp-load.php. Idempotent: an
 * option guard means re-running a blueprint against a persisted Playground
 * will not double up the content.
 *
 * @package query-filter
 */

namespace HM\Query_Loop_Filter\Tests;

if ( get_option( 'query_filter_e2e_seeded' ) ) {
	echo "Fixtures already seeded.\n";
	return;
}

/**
 * Create a post and return its ID.
 *
 * @param string $title  Post title.
 * @param string $type   Post type.
 * @param array  $extra  Additional wp_insert_post() arguments.
 * @return int Post ID.
 */
function seed_post( string $title, string $type = 'post', array $extra = [] ) : int {
	return wp_insert_post( array_merge( [
		'post_title' => $title,
		'post_name' => sanitize_title( $title ),
		'post_status' => 'publish',
		'post_type' => $type,
		'post_author' => 1,
		'post_content' => sprintf( 'Fixture content for %s.', $title ),
	], $extra ) );
}

// WordPress ships with a "Hello world!" post and a sample page. Remove all
// pre-existing content so the fixtures below are the only thing the loops can
// return, and so the default Uncategorized category stays empty and therefore
// out of the taxonomy filter's derived term list.
$existing = get_posts( [
	'post_type' => [ 'post', 'page' ],
	'post_status' => 'any',
	'numberposts' => -1,
	'fields' => 'ids',
] );

foreach ( $existing as $existing_id ) {
	wp_delete_post( $existing_id, true );
}

// Categories. "Unfiled Post" deliberately belongs to neither, so an active
// filter is distinguishable from no filter at all.
wp_insert_term( 'Alpha', 'category', [ 'slug' => 'alpha' ] );
wp_insert_term( 'Beta', 'category', [ 'slug' => 'beta' ] );

$alpha_one = seed_post( 'Alpha One' );
$alpha_two = seed_post( 'Alpha Two' );
$beta_one = seed_post( 'Beta One' );
$unfiled = seed_post( 'Unfiled Post' );

wp_set_object_terms( $alpha_one, [ 'alpha' ], 'category' );
wp_set_object_terms( $alpha_two, [ 'alpha' ], 'category' );
wp_set_object_terms( $beta_one, [ 'beta' ], 'category' );

// wp_insert_post() assigns the default category when a post is created without
// one. The point of this post is to belong to no category, and clearing it also
// leaves Uncategorized empty so it stays out of the filter's derived term list.
wp_set_object_terms( $unfiled, [], 'category' );

// Private taxonomy term on a post that is otherwise public, so a query string
// filter naming it would visibly narrow the results if it were honoured.
wp_insert_term( 'Classified', 'qf_hidden', [ 'slug' => 'classified' ] );
wp_set_object_terms( $alpha_one, [ 'classified' ], 'qf_hidden' );

// Second public post type.
seed_post( 'Doc One', 'qf_doc' );
seed_post( 'Doc Two', 'qf_doc' );

// Published, but in a post type that is not publicly queryable. If this title
// ever appears on the front end, something has gone wrong.
seed_post( 'Secret One', 'qf_secret' );

/**
 * Build the block markup for a query loop carrying filter blocks.
 *
 * @param int    $query_id Query ID for the loop.
 * @param string $filters  Serialized filter block markup to place in the loop.
 * @return string Block markup.
 */
function query_loop_markup( int $query_id, string $filters ) : string {
	$query = wp_json_encode( [
		'queryId' => $query_id,
		'query' => [
			'perPage' => 10,
			'pages' => 0,
			'offset' => 0,
			'postType' => 'post',
			'order' => 'asc',
			'orderBy' => 'title',
			'author' => '',
			'search' => '',
			'exclude' => [],
			'sticky' => '',
			'inherit' => false,
		],
	] );

	return <<<HTML
<!-- wp:query {$query} -->
<div class="wp-block-query">
{$filters}
<!-- wp:post-template -->
<!-- wp:post-title /-->
<!-- /wp:post-template -->
</div>
<!-- /wp:query -->
HTML;
}

// Page 1: taxonomy filter as a select.
seed_post( 'Taxonomy Filter', 'page', [
	'post_name' => 'taxonomy-filter',
	'post_content' => query_loop_markup(
		1,
		'<!-- wp:query-filter/taxonomy {"taxonomy":"category"} /-->'
	),
] );

// Page 2: taxonomy filter as checkboxes, for multi-term selection.
seed_post( 'Taxonomy Checkboxes', 'page', [
	'post_name' => 'taxonomy-checkboxes',
	'post_content' => query_loop_markup(
		2,
		'<!-- wp:query-filter/taxonomy {"taxonomy":"category","displayType":"checkbox"} /-->'
	),
] );

// Page 3: post type filter and the core search block.
seed_post( 'Post Type Filter', 'page', [
	'post_name' => 'post-type-filter',
	'post_content' => query_loop_markup(
		3,
		'<!-- wp:query-filter/post-type /-->' . "\n" . '<!-- wp:search {"buttonText":"Search"} /-->'
	),
] );

update_option( 'query_filter_e2e_seeded', 1 );

echo "Seeded query filter e2e fixtures.\n";

<?php
global $wp_query;

$id = 'query-filter-author-' . wp_generate_uuid4();

if ( $block->context['query']['inherit'] ) {
	$query_var = 'query-author'; // Changed from query-post_type
	$page_var = 'page';
	$base_url = str_replace( '/page/' . get_query_var( 'paged' ), '', remove_query_arg( [ $query_var, $page_var ] ) );
} else {
	$query_id = $block->context['queryId'] ?? 0;
	$query_var = sprintf( 'query-%d-author', $query_id ); // Changed from query-%d-post_type
	$page_var = isset( $block->context['queryId'] ) ? 'query-' . $block->context['queryId'] . '-page' : 'query-page';
	$base_url = remove_query_arg( [ $query_var, $page_var ] );
}

// Determine relevant post types for filtering authors.
$relevant_post_types = [];

// Get post types from block context if they are explicitly set.
if ( ! empty( $block->context['query']['postType'] ) ) {
	$types = is_array( $block->context['query']['postType'] ) ? $block->context['query']['postType'] : explode( ',', $block->context['query']['postType'] );
	$relevant_post_types = array_merge( $relevant_post_types, array_map( 'trim', $types ) );
}

// Support for enhanced query block (multiple_posts).
// if ( ! empty( $block->context['query']['multiple_posts'] ) && is_array( $block->context['query']['multiple_posts'] ) ) {
// 	$relevant_post_types = array_merge( $relevant_post_types, $block->context['query']['multiple_posts'] );
// }

// Handle inherited query.
if ( $block->context['query']['inherit'] && empty( $relevant_post_types ) ) {
	$main_query_post_type = $wp_query->get( 'post_type' );

	if ( empty( $main_query_post_type ) || 'any' === $main_query_post_type ) {
		// If main query is 'any' or not specific, consider all public, viewable post types.
		$public_types = get_post_types( [ 'public' => true, 'show_ui' => true ], 'names' );
		// Exclude 'attachment' by default, similar to how Query Loop block might treat 'any'.
		if ( ! get_option( 'wp_attachment_pages_enabled' ) ) {
			unset( $public_types['attachment'] );
		}
		$relevant_post_types = array_merge( $relevant_post_types, array_values( $public_types ) );
	} else {
		$relevant_post_types = array_merge( $relevant_post_types, (array) $main_query_post_type );
	}
}

$relevant_post_types = array_values( array_unique( array_filter( $relevant_post_types ) ) );

$user_args = [
	'capability'          => [ 'publish_posts' ], // Users who can publish posts
	'fields'              => [ 'ID', 'display_name' ],
	'orderby'             => 'display_name',
	'order'               => 'ASC',
];

// If specific post types are identified for the query, filter authors by those.
// Otherwise, get authors who have published any post (adhering to 'authors' role).
if ( ! empty( $relevant_post_types ) ) {
	$user_args['has_published_posts'] = $relevant_post_types;
} else {
	// If $relevant_post_types is empty, it implies the query is for "any" post type.
	// So, we list authors who have published any type of content.
	// `get_users` with `who => 'authors'` covers users with publishing roles.
	// Setting `has_published_posts = true` explicitly queries for posts in public post types.
	$user_args['has_published_posts'] = true;
}

$authors = get_users( $user_args );

if ( empty( $authors ) ) {
	return;
}
?>

<div <?php echo get_block_wrapper_attributes( [ 'class' => 'wp-block-query-filter' ] ); ?> data-wp-interactive="query-filter" data-wp-context="{}">
	<label class="wp-block-query-filter-author__label wp-block-query-filter__label<?php echo $attributes['showLabel'] ? '' : ' screen-reader-text' ?>" for="<?php echo esc_attr( $id ); ?>">
		<?php echo esc_html( $attributes['label'] ?? __( 'Author', 'query-filter' ) ); ?>
	</label>
	<select class="wp-block-query-filter-author__select wp-block-query-filter__select" id="<?php echo esc_attr( $id ); ?>" data-wp-on--change="actions.navigate">
		<option value="<?php echo esc_attr( $base_url ) ?>"><?php echo esc_html( $attributes['emptyLabel'] ?: __( 'All Authors', 'query-filter' ) ); ?></option>
		<?php foreach ( $authors as $author ) : ?>
			<option value="<?php echo esc_attr( add_query_arg( [ $query_var => $author->ID, $page_var => false ], $base_url ) ) ?>" <?php selected( $author->ID, wp_unslash( $_GET[ $query_var ] ?? '' ) ); ?>><?php echo esc_html( $author->display_name ); ?></option>
		<?php endforeach; ?>
	</select>
</div>

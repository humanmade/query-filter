# Query Loop Filters - Development Notes

This WordPress plugin adds interactive filtering capabilities to Query Loop blocks using the WordPress Interactivity API.

## Core Functionality

The plugin provides **two custom filter blocks** (Taxonomy Filter and Post Type Filter) that work seamlessly with the core Query Loop block and the Advanced Query Loop plugin. These filters enable users to interactively filter post listings without page reloads.

## Architecture

### PHP Components

**Block Registration** handles two primary blocks located in `src/taxonomy/` and `src/post-type/`, each with their own `block.json`, render templates, and editor scripts. The main bootstrap in `inc/namespace.php` registers these blocks and sets up the necessary server-side rendering.

**Server-Side Rendering** uses dynamic render callbacks (defined in `render.php` files) to output the filter controls with proper Interactivity API directives and data attributes.

### JavaScript Architecture

**Editor Scripts** (`edit.js`) provide the block editor interface with custom controls for:
- Taxonomy selection and label customization (Taxonomy Filter)
- Label and placeholder text options (Post Type Filter)
- Real-time preview of filter appearance

**View Scripts** (`view.js`) power the frontend interactivity using the WordPress Interactivity API, handling user interactions and triggering query updates without full page reloads.

## Interactivity API Integration

The plugin leverages WordPress's **Interactivity API** to create reactive filter controls. Each filter block:
- Uses `data-wp-interactive` attributes to define interactive regions
- Implements state management for selected filter values
- Triggers query block updates through the Interactivity API's routing system
- Maintains URL parameters to support direct linking and browser history

## Filter Types

### Taxonomy Filter
Allows filtering by any registered taxonomy (categories, tags, or custom taxonomies). Supports:
- Dynamic taxonomy selection in the editor
- Customizable labels and placeholder text
- Option to show/hide the label
- Integration with query loop block's taxonomy query parameters

### Post Type Filter
Enables filtering by post type when used with the **Advanced Query Loop plugin** (required for post type filtering). Features:
- Label customization
- Placeholder text for the "all posts" state
- Dynamic post type switching without page reload

### Search Integration
Works with the core Search block to enable keyword-based filtering alongside taxonomy and post type filters.

## Dependencies

**Required**: WordPress 6.6+ with Interactivity API support
**PHP**: 8.0 or higher
**For Post Type Filtering**: Advanced Query Loop plugin

## Development Workflow

### Build Commands
- `npm start` - Development build with file watching
- `npm run build` - Production build with optimized assets
- `npm run lint:js` - JavaScript linting
- `npm run lint:css` - CSS linting

### Local Development
- `npm run playground:start` - Launches WordPress Playground on port 9400 with the plugin pre-configured
- Blueprint includes Twenty Twenty-Five theme and debug mode enabled

### Testing
- `npm run test:e2e` - Runs Playwright end-to-end tests
- Tests validate filter functionality, query updates, and Interactivity API integration

## Key Implementation Details

**Query Loop Integration**: Filters work by updating the query parameters through the Interactivity API's router, which then triggers the Query Loop block to refetch and re-render with the new filters applied.

**State Management**: Filter selections are maintained in the URL and Interactivity API state, ensuring filters persist across browser navigation and can be shared via direct links.

**Block Variation Pattern**: While not using block variations like HM URL Tabs, this plugin follows a similar pattern of enhancing core blocks (Query Loop) with additional functionality through companion filter blocks.

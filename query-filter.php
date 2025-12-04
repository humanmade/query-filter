<?php
/**
 * Plugin Name:       Query Loop Filters
 * Description:       Filter blocks for the query loop utilising the interactivity API.
 * Requires at least: 6.6
 * Requires PHP:      8.0
 * Version:           0.2.3
 * Author:            Human Made Limited
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       query-filter
 *
 * @package           query-filter
 */
namespace HM\Query_Loop_Filter;

const PLUGIN_FILE = __FILE__;
const ROOT_DIR = __DIR__;

require_once __DIR__ . '/inc/namespace.php';

bootstrap();

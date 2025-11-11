# Query Loop Filters

![image](https://github.com/user-attachments/assets/85358de8-0929-47fe-85f5-b53a59fb522e)

This plugin allows you to easily add filters to any query loop block.

Provides 2 new blocks that can be added within a query loop block to allow filtering by either post type or a taxonomy. Also supports using the core search block to allow you to search.

Compatible with both the core query loop block and the [Advanced query loop plugin](https://wordpress.org/plugins/advanced-query-loop/) (In fact, in order to use post type filters, use of the Advanced Query Loop plugin is required). 

Easy to use and lightweight, built using the WordPress Interactivity API.

## Usage

* Add a query block. This can anyhere that the query block is supported e.g. page, template, or pattern.
* Add one of the filter blocks and configure as required:
    * Taxonomy filter. Select which taxonomy to to use, customise the label (and whether it's shown), and customise the text used when none is selected.
    * Post type filter. Customise the label (and whether it's shown), as well as the text used when no filter is applied.
    * Search block. No extra options.
 
![image](https://github.com/user-attachments/assets/e2f9b62d-91f7-4c22-87ac-078b4d031a60)

## Installation

### Using Composer

This plugin is available on packagist.

`composer require humanmade/query-filter`

### Manually from Github. 

1. Download the plugin from the [GitHub repository](https://github.com/humanmade/query-filter).
2. Upload the plugin to your site's `wp-content/plugins` directory.
3. Activate the plugin from the WordPress admin.

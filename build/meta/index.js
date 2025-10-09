/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/meta/edit.js":
/*!**************************!*\
  !*** ./src/meta/edit.js ***!
  \**************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ Edit)
/* harmony export */ });
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_block_editor__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/block-editor */ "@wordpress/block-editor");
/* harmony import */ var _wordpress_block_editor__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_block_editor__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @wordpress/components */ "@wordpress/components");
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _wordpress_core_data__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @wordpress/core-data */ "@wordpress/core-data");
/* harmony import */ var _wordpress_core_data__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_wordpress_core_data__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _wordpress_data__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! @wordpress/data */ "@wordpress/data");
/* harmony import */ var _wordpress_data__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(_wordpress_data__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! @wordpress/element */ "@wordpress/element");
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(_wordpress_element__WEBPACK_IMPORTED_MODULE_5__);
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! react/jsx-runtime */ "react/jsx-runtime");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__);







function Edit({
  attributes,
  setAttributes,
  context
}) {
  const {
    metaKey,
    emptyLabel,
    label,
    showLabel
  } = attributes;
  const [metaFieldOptions, setMetaFieldOptions] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_5__.useState)([]);

  // Get post types from query context
  let contextPostTypes = (context.query.postType || '').split(',').map(type => type.trim());

  // Support for enhanced query loop block plugin.
  if (Array.isArray(context.query.multiple_posts)) {
    contextPostTypes = contextPostTypes.concat(context.query.multiple_posts);
  }

  // Fetch a single post for each post type to get meta fields
  const postsData = (0,_wordpress_data__WEBPACK_IMPORTED_MODULE_4__.useSelect)(select => {
    const {
      getEntityRecords
    } = select(_wordpress_core_data__WEBPACK_IMPORTED_MODULE_3__.store);
    const data = {};
    contextPostTypes.forEach(postType => {
      data[postType] = getEntityRecords('postType', postType, {
        per_page: 1,
        context: 'edit'
      });
    });
    return data;
  }, [contextPostTypes]);

  // Get meta cardinality and values from the data store
  const {
    metaCardinalities,
    metaValues,
    isLoadingValues
  } = (0,_wordpress_data__WEBPACK_IMPORTED_MODULE_4__.useSelect)(select => {
    const metaStore = select('query-filter/meta');
    const cardinalities = {};

    // Get cardinality for all meta keys across all post types
    contextPostTypes.forEach(postType => {
      const posts = postsData[postType];
      if (posts && posts.length > 0 && posts[0].meta) {
        Object.keys(posts[0].meta).forEach(key => {
          if (!cardinalities[key]) {
            cardinalities[key] = metaStore?.getMetaCardinality(postType, key);
          }
        });
      }
    });

    // Get meta values for selected key
    const values = metaKey && contextPostTypes.length > 0 ? metaStore?.getMetaValues(contextPostTypes, metaKey) : [];
    return {
      metaCardinalities: cardinalities,
      metaValues: values || [],
      isLoadingValues: !metaKey || values === undefined
    };
  }, [contextPostTypes, postsData, metaKey]);

  // Extract meta fields from posts and combine with cardinality
  const allMetaKeys = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_5__.useMemo)(() => {
    const metaKeySet = new Set();
    contextPostTypes.forEach(postType => {
      const posts = postsData[postType];
      if (posts && posts.length > 0 && posts[0].meta) {
        Object.keys(posts[0].meta).forEach(key => {
          metaKeySet.add(key);
        });
      }
    });
    return Array.from(metaKeySet);
  }, [postsData, contextPostTypes]);

  // Build field options when meta keys or cardinalities change
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_5__.useEffect)(() => {
    const fields = allMetaKeys.map(key => {
      const cardinality = metaCardinalities[key] || 0;
      const tooManyValues = cardinality > 50;
      return {
        label: tooManyValues ? `${key} (too many values)` : key,
        value: key,
        disabled: tooManyValues,
        cardinality
      };
    });

    // Sort fields: enabled first, then by label
    fields.sort((a, b) => {
      if (a.disabled !== b.disabled) {
        return a.disabled ? 1 : -1;
      }
      return a.label.localeCompare(b.label);
    });
    setMetaFieldOptions(fields);
  }, [allMetaKeys, metaCardinalities]);
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.Fragment, {
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_block_editor__WEBPACK_IMPORTED_MODULE_1__.InspectorControls, {
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.PanelBody, {
        title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Meta Field Settings', 'query-filter'),
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.SelectControl, {
          label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Select Meta Field', 'query-filter'),
          value: metaKey,
          options: [{
            label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Select a field...', 'query-filter'),
            value: ''
          }, ...metaFieldOptions],
          onChange: newMetaKey => {
            const selectedField = metaFieldOptions.find(field => field.value === newMetaKey);
            setAttributes({
              metaKey: newMetaKey,
              label: selectedField?.label?.replace(' (too many values)', '') || ''
            });
          }
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.TextControl, {
          label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Label', 'query-filter'),
          value: label,
          help: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('If empty then no label will be shown', 'query-filter'),
          onChange: newLabel => setAttributes({
            label: newLabel
          })
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.ToggleControl, {
          label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Show Label', 'query-filter'),
          checked: showLabel,
          onChange: newShowLabel => setAttributes({
            showLabel: newShowLabel
          })
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.TextControl, {
          label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Empty Choice Label', 'query-filter'),
          value: emptyLabel,
          placeholder: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('All', 'query-filter'),
          onChange: newEmptyLabel => setAttributes({
            emptyLabel: newEmptyLabel
          })
        })]
      })
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("div", {
      ...(0,_wordpress_block_editor__WEBPACK_IMPORTED_MODULE_1__.useBlockProps)({
        className: 'wp-block-query-filter'
      }),
      children: [showLabel && label && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("label", {
        className: "wp-block-query-filter-meta__label wp-block-query-filter__label",
        children: label
      }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("select", {
        className: "wp-block-query-filter-meta__select wp-block-query-filter__select",
        inert: "true",
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("option", {
          children: emptyLabel || (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('All', 'query-filter')
        }), isLoadingValues && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)("option", {
          disabled: true,
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Spinner, {}), ' ', (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Loading values...', 'query-filter')]
        }), !isLoadingValues && metaValues.map((value, index) => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("option", {
          children: value
        }, index))]
      })]
    })]
  });
}

/***/ }),

/***/ "./src/store/index.js":
/*!****************************!*\
  !*** ./src/store/index.js ***!
  \****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _wordpress_data__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/data */ "@wordpress/data");
/* harmony import */ var _wordpress_data__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_data__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/api-fetch */ "@wordpress/api-fetch");
/* harmony import */ var _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1__);


const DEFAULT_STATE = {
  metaCardinality: {},
  metaValues: {}
};
const actions = {
  setMetaCardinality(postType, metaKey, cardinality) {
    return {
      type: 'SET_META_CARDINALITY',
      postType,
      metaKey,
      cardinality
    };
  },
  setMetaValues(postTypes, metaKey, values) {
    return {
      type: 'SET_META_VALUES',
      postTypes,
      metaKey,
      values
    };
  },
  fetchMetaCardinality(postType, metaKey) {
    return async ({
      dispatch
    }) => {
      try {
        const response = await _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1___default()({
          path: `/query-filter/v1/meta-cardinality?post_type=${postType}&meta_key=${metaKey}`
        });
        const cardinality = response?.cardinality || 0;
        dispatch.setMetaCardinality(postType, metaKey, cardinality);
        return cardinality;
      } catch (error) {
        // Assume too many if error
        dispatch.setMetaCardinality(postType, metaKey, 999);
        return 999;
      }
    };
  },
  fetchMetaValues(postTypes, metaKey) {
    return async ({
      dispatch
    }) => {
      try {
        const response = await _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_1___default()({
          path: `/query-filter/v1/meta-values?post_type=${postTypes.join(',')}&meta_key=${metaKey}`
        });
        const values = response?.values || [];
        dispatch.setMetaValues(postTypes, metaKey, values);
        return values;
      } catch (error) {
        dispatch.setMetaValues(postTypes, metaKey, []);
        return [];
      }
    };
  }
};
const selectors = {
  getMetaCardinality(state, postType, metaKey) {
    const key = `${postType}_${metaKey}`;
    return state.metaCardinality[key];
  },
  getMetaValues(state, postTypes, metaKey) {
    const key = `${postTypes.join('_')}_${metaKey}`;
    return state.metaValues[key];
  }
};
const reducer = (state = DEFAULT_STATE, action) => {
  switch (action.type) {
    case 'SET_META_CARDINALITY':
      {
        const key = `${action.postType}_${action.metaKey}`;
        return {
          ...state,
          metaCardinality: {
            ...state.metaCardinality,
            [key]: action.cardinality
          }
        };
      }
    case 'SET_META_VALUES':
      {
        const key = `${action.postTypes.join('_')}_${action.metaKey}`;
        return {
          ...state,
          metaValues: {
            ...state.metaValues,
            [key]: action.values
          }
        };
      }
    default:
      return state;
  }
};
const resolvers = {
  *getMetaCardinality(postType, metaKey) {
    const cardinality = yield actions.fetchMetaCardinality(postType, metaKey);
    return cardinality;
  },
  *getMetaValues(postTypes, metaKey) {
    const values = yield actions.fetchMetaValues(postTypes, metaKey);
    return values;
  }
};
const store = (0,_wordpress_data__WEBPACK_IMPORTED_MODULE_0__.createReduxStore)('query-filter/meta', {
  reducer,
  actions,
  selectors,
  resolvers
});
(0,_wordpress_data__WEBPACK_IMPORTED_MODULE_0__.register)(store);
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (store);

/***/ }),

/***/ "react/jsx-runtime":
/*!**********************************!*\
  !*** external "ReactJSXRuntime" ***!
  \**********************************/
/***/ ((module) => {

module.exports = window["ReactJSXRuntime"];

/***/ }),

/***/ "@wordpress/api-fetch":
/*!**********************************!*\
  !*** external ["wp","apiFetch"] ***!
  \**********************************/
/***/ ((module) => {

module.exports = window["wp"]["apiFetch"];

/***/ }),

/***/ "@wordpress/block-editor":
/*!*************************************!*\
  !*** external ["wp","blockEditor"] ***!
  \*************************************/
/***/ ((module) => {

module.exports = window["wp"]["blockEditor"];

/***/ }),

/***/ "@wordpress/blocks":
/*!********************************!*\
  !*** external ["wp","blocks"] ***!
  \********************************/
/***/ ((module) => {

module.exports = window["wp"]["blocks"];

/***/ }),

/***/ "@wordpress/components":
/*!************************************!*\
  !*** external ["wp","components"] ***!
  \************************************/
/***/ ((module) => {

module.exports = window["wp"]["components"];

/***/ }),

/***/ "@wordpress/core-data":
/*!**********************************!*\
  !*** external ["wp","coreData"] ***!
  \**********************************/
/***/ ((module) => {

module.exports = window["wp"]["coreData"];

/***/ }),

/***/ "@wordpress/data":
/*!******************************!*\
  !*** external ["wp","data"] ***!
  \******************************/
/***/ ((module) => {

module.exports = window["wp"]["data"];

/***/ }),

/***/ "@wordpress/element":
/*!*********************************!*\
  !*** external ["wp","element"] ***!
  \*********************************/
/***/ ((module) => {

module.exports = window["wp"]["element"];

/***/ }),

/***/ "@wordpress/i18n":
/*!******************************!*\
  !*** external ["wp","i18n"] ***!
  \******************************/
/***/ ((module) => {

module.exports = window["wp"]["i18n"];

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
/*!***************************!*\
  !*** ./src/meta/index.js ***!
  \***************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _wordpress_blocks__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/blocks */ "@wordpress/blocks");
/* harmony import */ var _wordpress_blocks__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_blocks__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _edit__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./edit */ "./src/meta/edit.js");
/* harmony import */ var _store__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../store */ "./src/store/index.js");



(0,_wordpress_blocks__WEBPACK_IMPORTED_MODULE_0__.registerBlockType)('query-filter/meta', {
  edit: _edit__WEBPACK_IMPORTED_MODULE_1__["default"]
});
/******/ })()
;
//# sourceMappingURL=index.js.map
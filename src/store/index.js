import { createReduxStore, register } from '@wordpress/data';
import apiFetch from '@wordpress/api-fetch';

const DEFAULT_STATE = {
	metaCardinality: {},
	metaValues: {},
};

const actions = {
	setMetaCardinality( postType, metaKey, cardinality ) {
		return {
			type: 'SET_META_CARDINALITY',
			postType,
			metaKey,
			cardinality,
		};
	},

	setMetaValues( postTypes, metaKey, values ) {
		return {
			type: 'SET_META_VALUES',
			postTypes,
			metaKey,
			values,
		};
	},

	fetchMetaCardinality( postType, metaKey ) {
		return async ( { dispatch } ) => {
			try {
				const response = await apiFetch( {
					path: `/query-filter/v1/meta-cardinality?post_type=${ postType }&meta_key=${ metaKey }`,
				} );
				const cardinality = response?.cardinality || 0;
				dispatch.setMetaCardinality( postType, metaKey, cardinality );
				return cardinality;
			} catch ( error ) {
				// Assume too many if error
				dispatch.setMetaCardinality( postType, metaKey, 999 );
				return 999;
			}
		};
	},

	fetchMetaValues( postTypes, metaKey ) {
		return async ( { dispatch } ) => {
			try {
				const response = await apiFetch( {
					path: `/query-filter/v1/meta-values?post_type=${ postTypes.join( ',' ) }&meta_key=${ metaKey }`,
				} );
				const values = response?.values || [];
				dispatch.setMetaValues( postTypes, metaKey, values );
				return values;
			} catch ( error ) {
				dispatch.setMetaValues( postTypes, metaKey, [] );
				return [];
			}
		};
	},
};

const selectors = {
	getMetaCardinality( state, postType, metaKey ) {
		const key = `${ postType }_${ metaKey }`;
		return state.metaCardinality[ key ];
	},

	getMetaValues( state, postTypes, metaKey ) {
		const key = `${ postTypes.join( '_' ) }_${ metaKey }`;
		return state.metaValues[ key ];
	},
};

const reducer = ( state = DEFAULT_STATE, action ) => {
	switch ( action.type ) {
		case 'SET_META_CARDINALITY': {
			const key = `${ action.postType }_${ action.metaKey }`;
			return {
				...state,
				metaCardinality: {
					...state.metaCardinality,
					[ key ]: action.cardinality,
				},
			};
		}

		case 'SET_META_VALUES': {
			const key = `${ action.postTypes.join( '_' ) }_${ action.metaKey }`;
			return {
				...state,
				metaValues: {
					...state.metaValues,
					[ key ]: action.values,
				},
			};
		}

		default:
			return state;
	}
};

const resolvers = {
	*getMetaCardinality( postType, metaKey ) {
		const cardinality = yield actions.fetchMetaCardinality( postType, metaKey );
		return cardinality;
	},

	*getMetaValues( postTypes, metaKey ) {
		const values = yield actions.fetchMetaValues( postTypes, metaKey );
		return values;
	},
};

const store = createReduxStore( 'query-filter/meta', {
	reducer,
	actions,
	selectors,
	resolvers,
} );

register( store );

export default store;

/* global globalThis */
module.exports = async () => {
	const cli = globalThis.__wpPlayground;

	if ( ! cli ) {
		return;
	}

	if ( typeof cli[ Symbol.asyncDispose ] === 'function' ) {
		await cli[ Symbol.asyncDispose ]();
	} else {
		await cli.server?.close();
	}
};

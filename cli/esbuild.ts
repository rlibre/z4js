/**
 *     _____ __
 *    |__   /  / _
 *      /  /  /_| |_
 *     /  /\____   _|
 *    /_____|   |_|
 *
 * @file esbuild.ts
 * @author Etienne Cochard
 *
 * @copyright (c) 2026 R-libre ingenierie
 *
 * Use of this source code is governed by an MIT-style license
 * that can be found in the LICENSE file or at https://opensource.org/licenses/MIT.
 **/

// esbuild is loaded on demand, by the build and dev commands only: a static import
// would be hoisted to the top of the bundle, and apidoc or log would load it for nothing

export function loadEsbuild( ) {
	return import( "esbuild" );
}

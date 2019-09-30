/**
 * External dependencies
 */
import { castArray, noop } from 'lodash';
import classnames from 'classnames';

/**
 * WordPress dependencies
 */
import { Disabled } from '@wordpress/components';
import { withSelect } from '@wordpress/data';
import { useLayoutEffect, useState, useRef, useReducer, useMemo } from '@wordpress/element';

/**
 * Internal dependencies
 */
import BlockEditorProvider from '../provider';
import BlockList from '../block-list';
import { getBlockPreviewContainerDOMNode } from '../../utils/dom';

const getOnlineStyles = ( scale, x, y, isReady, width ) => ( {
	transform: `scale(${ scale })`,
	visibility: isReady ? 'visible' : 'hidden',
	left: -x,
	top: y,
	width,
} );

function ScaledBlockPreview( { blocks, viewportWidth, onReady } ) {
	const previewRef = useRef( null );

	const [ isReady, setIsReady ] = useState( false );
	const [ previewScale, setPreviewScale ] = useState( 1 );
	const [ { x, y }, setPosition ] = useState( { x: 0, y: 0 } );

	// Dynamically calculate the scale factor
	useLayoutEffect( () => {
		// Timer - required to account for async render of `BlockEditorProvider`
		const timerId = setTimeout( () => {
			const containerElement = previewRef.current;
			if ( ! containerElement ) {
				return;
			}

			// Auxiliary vars used for onReady() callback.
			let scale, _x = 0, _y = 0;

			// If we're previewing a single block, scale the preview to fit it.
			if ( blocks.length === 1 ) {
				const block = blocks[ 0 ];
				const previewElement = getBlockPreviewContainerDOMNode( block.clientId, containerElement );
				if ( ! previewElement ) {
					return;
				}

				const containerElementRect = containerElement.getBoundingClientRect();
				const scaledElementRect = previewElement.getBoundingClientRect();

				scale = containerElementRect.width / scaledElementRect.width || 1;
				const offsetX = scaledElementRect.left - containerElementRect.left;
				const offsetY = ( containerElementRect.height > scaledElementRect.height * scale ) ?
					( containerElementRect.height - ( scaledElementRect.height * scale ) ) / 2 : 0;
				_x = offsetX * scale;
				_y = offsetY;

				setPreviewScale( scale );
				setPosition( { x: _x, y: _y } );

				// Hack: we need  to reset the scaled elements margins
				previewElement.style.marginTop = '0';
			} else {
				const containerElementRect = containerElement.getBoundingClientRect();
				scale = containerElementRect.width / viewportWidth;
				setPreviewScale( scale );
			}

			setIsReady( true );
			onReady( {
				scale,
				position: { x: _x, y: _y },
				previewContainerRef: previewRef,
				styles: getOnlineStyles( scale, _x, _y, true, viewportWidth ),
			} );
		}, 0 );

		// Cleanup
		return () => {
			if ( timerId ) {
				window.clearTimeout( timerId );
			}
		};
	}, [] );

	if ( ! blocks || blocks.length === 0 ) {
		return null;
	}

	const previewStyles = getOnlineStyles( previewScale, x, y, isReady, viewportWidth );

	return (
		<div
			ref={ previewRef }
			className={ classnames( 'block-editor-block-preview__container editor-styles-wrapper', {
				'is-ready': isReady,
			} ) }
			aria-hidden
		>
			<Disabled style={ previewStyles } className="block-editor-block-preview__content">
				<BlockList />
			</Disabled>
		</div>
	);
}

export function BlockPreview( { blocks, viewportWidth = 700, settings, __experimentalOnReady = noop } ) {
	const renderedBlocks = useMemo( () => castArray( blocks ), [ blocks ] );
	const [ recompute, triggerRecompute ] = useReducer( ( state ) => state + 1, 0 );
	useLayoutEffect( triggerRecompute, [ blocks ] );
	return (
		<BlockEditorProvider
			value={ renderedBlocks }
			settings={ settings }
		>
			{
				/*
				 * The key prop is used to force recomputing the preview
				 * by remounting the component, ScaledBlockPreview is not meant to
				 * be rerendered.
				 */
			}
			<ScaledBlockPreview
				key={ recompute }
				blocks={ renderedBlocks }
				viewportWidth={ viewportWidth }
				onReady={ __experimentalOnReady }
			/>
		</BlockEditorProvider>
	);
}

/**
 * BlockPreview renders a preview of a block or array of blocks.
 *
 * @see https://github.com/WordPress/gutenberg/blob/master/packages/block-editor/src/components/block-preview/README.md
 *
 * @param {Array|Object} blocks A block instance (object) or an array of blocks to be previewed.
 * @param {number} viewportWidth Width of the preview container in pixels. Controls at what size the blocks will be rendered inside the preview. Default: 700.
 * @return {WPElement} Rendered element.
 */
export default withSelect( ( select ) => {
	return {
		settings: select( 'core/block-editor' ).getSettings(),
	};
} )( BlockPreview );

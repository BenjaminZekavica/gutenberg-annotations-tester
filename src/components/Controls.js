const { Component } = wp.element;
const { withSelect, withDispatch } = wp.data;
const { PanelBody, Button } = wp.components;
const { compose } = wp.compose;

const ANNOTATION_SOURCE = 'annotations-tester';

const getXPathNodeIndex = ( node ) => {
	let typeIndex = 1; // Default index.

	if ( ! node.parentNode || ! node.parentNode.hasChildNodes() ) {
		return typeIndex;
	}

	const childNodes = node.parentNode.childNodes;

	for ( let i = 0; i < childNodes.length; i++ ) {
		if ( childNodes[ i ] === node ) {
			break;
		}

		if ( childNodes[ i ].nodeType !== node.nodeType ) {
			continue;
		}

		switch ( childNodes[ i ].nodeType ) {
			case Node.ELEMENT_NODE:
				typeIndex += childNodes[ i ].tagName === node.tagName ? 1 : 0;
				break;

			case Node.TEXT_NODE:
			default: // e.g., comments, processing instructions.
				typeIndex += 1;
				break;
		}
	}

	return typeIndex;
};

const getTagName = ( element ) => {
	return element.tagName.toLowerCase();
};

const getXPathSelector = ( root, node ) => {
	const selectors = [];

	while ( node.parentNode ) {
		if ( node === root ) {
			break;
		}

		switch ( node.nodeType ) {
			case Node.ELEMENT_NODE:
				selectors.unshift( getTagName( node ) + '[' + getXPathNodeIndex( node ) + ']' );
				break;

			case Node.TEXT_NODE:
				selectors.unshift( 'text()[' + getXPathNodeIndex( node ) + ']' );
				break;

			default: // e.g., comments, processing instructions.
				break; // Do not include.
		}

		node = node.parentNode;
	}

	return selectors.join( '/' );
};

const getClosestElement = ( node ) => {
	switch ( node.nodeType ) {
		case Node.ELEMENT_NODE:
			return node;

		case Node.TEXT_NODE:
		default: // e.g., comments, processing instructions.
			return node.parentElement || null;
	}
};

const getClosestEditable = ( node ) => {
	const element = getClosestElement( node );

	if ( ! element ) {
		return null;
	}

	return element.closest( '.editor-rich-text__tinymce' ) ||
		null;
};

export function getAnnotationFromSelection( block ) {
	const selection = window.getSelection();
	const range = selection.rangeCount ? selection.getRangeAt( 0 ) : null;
	const editable = range ? getClosestEditable( range.startContainer ) : null;

	console.log( editable );

	return {
		block,
		startXPath: getXPathSelector( editable, range.startContainer ),
		startOffset: range.startOffset,
		endXPath: getXPathSelector( editable, range.endContainer ),
		endOffset: range.endOffset,
		source: ANNOTATION_SOURCE,
	};
}

class RemoveSource extends Component {
	constructor( props ) {
		super( props );

		this.handleClick = this.handleClick.bind( this );
	}

	handleClick() {
		this.props.onRemove( this.props.source );
	}

	render() {
		return <Button isDefault onClick={ this.handleClick }>
			Remove source &ldquo;{ this.props.source }&rdquo;
		</Button>;
	}
}

class Controls extends Component {
	constructor( props ) {
		super( props );

		this.handleAnnotateSelectedBlocks = this.handleAnnotateSelectedBlocks.bind( this );
		this.handleAnnotateSelection = this.handleAnnotateSelection.bind( this );
	}

	handleAnnotateSelectedBlocks() {
		const { blockSelectionStart: start, blockSelectionEnd: end, blockOrder, addAnnotation } = this.props;

		const startPos = blockOrder.indexOf( start );
		const endPos = blockOrder.indexOf( end );

		for ( let i = startPos; i <= endPos; i++ ) {
			const current = blockOrder[ i ];

			const annotation = {
				block: current,
				isBlockAnnotation: true,
				source: ANNOTATION_SOURCE,
			};

			addAnnotation( annotation );
		}
	}

	handleAnnotateSelection() {
		const { blockSelectionStart: start, blockSelectionEnd: end, addAnnotation } = this.props;

		if ( start !== end ) {
			return;
		}

		const annotation = getAnnotationFromSelection( start );

		console.log( annotation );

		addAnnotation( annotation );
	}

	render() {
		const { annotations, removeSource, blockSelectionStart, blockSelectionEnd } = this.props;

		const sources = [ ...new Set( annotations.map( ( annotation ) => {
			return annotation.source;
		} ) ) ];
		const hasSources = sources.length > 0;

		return <PanelBody
			title="Controls"
			initialOpen={ true }
		>
			<Button isDefault onClick={ this.handleAnnotateSelectedBlocks }>Annotate selected blocks</Button>
			<Button isDefault onClick={ this.handleAnnotateSelection }>Annotate current selection</Button>

			{ hasSources && <h3>Sources</h3> }
			{ sources.map( ( source ) => {
				return <RemoveSource key={ source } source={ source } onRemove={ removeSource } />;
			} ) }
		</PanelBody>;
	}
}

export default compose( [
	withSelect( ( select ) => {
		const { getAnnotations, getBlockSelectionStart, getBlockSelectionEnd, getBlockOrder } = select( 'core/editor' );

		return {
			annotations: getAnnotations(),
			blockSelectionStart: getBlockSelectionStart(),
			blockSelectionEnd: getBlockSelectionEnd(),
			blockOrder: getBlockOrder(),
		};
	} ),
	withDispatch( ( dispatch ) => {
		const { removeAnnotationsBySource, addAnnotation } = dispatch( 'core/editor' );

		return {
			removeSource: removeAnnotationsBySource,
			addAnnotation,
		};
	} ),
] )( Controls );

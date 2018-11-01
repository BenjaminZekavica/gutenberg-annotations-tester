import { buildPositionalTree } from '../functions/xpath.js';

const { Component } = wp.element;
const { withSelect, withDispatch } = wp.data;
const { PanelBody, Button } = wp.components;
const { compose } = wp.compose;

const ANNOTATION_SOURCE = 'annotations-tester';

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

function findNodeIndex( node ) {
	let { type } = node;

	if ( typeof node.text === 'string' ) {
		type = 'text';
	}

	const children = node.parent.children;

	let count = 0;
	let endCount = -100;

	children.forEach( ( child ) => {
		if (
			child.type === type ||
			( type === 'text' && typeof child.text === 'string' )
		) {
			if ( child === node ) {
				endCount = count;
			}

			count++;
		}
	} );

	// Add 1 because XPath indexes start at 1.
	return endCount + 1;
}

function findNode( pos, children = [] ) {
	let foundNode = false;
	let foundOffset = 0;

	children.forEach( ( child ) => {
		if ( pos >= child.pos ) {
			foundNode = child;
			foundOffset = pos - child.pos;
		}
	} );

	return { node: foundNode, offset: foundOffset };
}

function findXPathFromPos( pos, tree ) {
	const { node, offset } = findNode( pos, tree.children );
	const index = findNodeIndex( node );

	if ( typeof node.text === 'string' ) {
		return {
			xpath: 'text()[' + index + ']',
			offset,
		};
	}

	const currentNodePath = node.type + '[' + index + ']';
	const childPath = findXPathFromPos( pos, node );

	return {
		xpath: currentNodePath + '/' + childPath.xpath,
		offset: childPath.offset,
	};
}

function removeAnnotations( record ) {
	return wp.richText.removeFormat( record, 'core/annotation', 0, record.text.length );
}

export function getAnnotationFromSelection( blockClientId ) {
	const selection = window.getSelection();
	const range = selection.rangeCount ? selection.getRangeAt( 0 ) : null;
	const editable = range ? getClosestEditable( range.startContainer ) : null;

	const record = wp.richText.create( { element: editable, range } );
	const { start, end } = record;

	const strippedRecord = removeAnnotations( record );

	const tree = buildPositionalTree( strippedRecord );

	const startPath = findXPathFromPos( start, tree );
	const endPath = findXPathFromPos( end, tree );

	const startXPath = startPath.xpath;
	const endXPath = endPath.xpath;
	const startOffset = startPath.offset;
	const endOffset = endPath.offset;

	return {
		blockClientId,
		range: {
			startXPath,
			startOffset,
			endXPath,
			endOffset,
		},
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
				blockClientId: current,
				scope: 'block',
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

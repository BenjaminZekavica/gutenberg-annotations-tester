import ReactJson from 'react-json-view';

const { Component } = wp.element;
const { withSelect } = wp.data;
const { PanelBody } = wp.components;

class Annotations extends Component {
	render() {
		const { annotations } = this.props;

		return <PanelBody
			title="Current annotations"
			initialOpen={ true }
		>
			<ReactJson name={ null } src={ annotations } />
		</PanelBody>;
	}
}

export default withSelect( ( select ) => {
	return {
		annotations: select( 'core/editor' ).getAnnotations(),
	};
} )( Annotations );

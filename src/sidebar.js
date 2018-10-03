import Annotations from './components/Annotations';
import Controls from './components/Controls';

wp.plugins.registerPlugin( 'annotations-tester', {
	render: () => {
		const { PluginSidebar, PluginSidebarMoreMenuItem } = wp.editPost;

		return <div>
			<PluginSidebarMoreMenuItem
				target="annotations-tester"
			>
				Yoast SEO
			</PluginSidebarMoreMenuItem>
			<PluginSidebar
				name="annotations-tester"
				title="Annotations tester"
			>
				<Controls />
				<Annotations />
			</PluginSidebar>
		</div>;
	},
} );

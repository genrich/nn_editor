function Viewport (container)
{
    var camera, scene, renderer, controls, light;

    scene = new THREE.Scene ();

    scene.add (new THREE.AmbientLight (0x404040));

    light = new THREE.DirectionalLight (0xffffff);
    scene.add (light);

    camera = new THREE.PerspectiveCamera (75, container.width () / container.height (), 1, 10000);
    camera.position.set (100, 100, 100);
    camera.up.set (0, 0, 1);

    controls = new THREE.TrackballControls (camera, container[0]);
    controls.target.set (0, 0, 0);
    controls.addEventListener ('change', updateLightPosition);
    updateLightPosition ();

    renderer = new THREE.WebGLRenderer ({ antialias: true });
    renderer.setClearColor ($('body').css ('background-color'));
    renderer.setSize (container.width (), container.height ());

    container.append (renderer.domElement);

    window.addEventListener ('resize', onWindowResize, false);

    (function animate (timestamp)
    {
        renderer.render (scene, camera);

        requestAnimationFrame (animate);
    }) ();

    function onWindowResize ()
    {
        camera.aspect = container.width () / container.height ();
        camera.updateProjectionMatrix ();

        renderer.setSize (container.width (), container.height ());
    }

    function updateLightPosition ()
    {
        light.position.copy (camera.position);
        light.target.position.copy (controls.target);
        light.target.updateMatrixWorld ();
    };
}

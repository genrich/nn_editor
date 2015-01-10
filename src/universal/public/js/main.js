function main ()
{
    if (!Detector.webgl)
    {
        $('body').empty ();
        Detector.addGetWebGLMessage ();
        throw 'WebGL not supported';
    }

    var viewport = new Viewport ($('#viewport'));

    $.getJSON ('neuron', function (data)
    {
        var datGui = new dat.GUI ();
        datGui.close ();
        datGui.add (data, 'name', ['neuron1']);

        var boundingBox = datGui.addFolder ('boundingBox');
        boundingBox.open ();

        var minCorner = boundingBox.addFolder ('minCorner');
        minCorner.open ();

        minCorner.add (data.boundingBox.minCorner, 'x', -100, 100).onChange (viewport.updateMinCornerX)
                                                                  .onFinishChange (update (data));
        minCorner.add (data.boundingBox.minCorner, 'y', -100, 100).onChange (viewport.updateMinCornerY)
                                                                  .onFinishChange (update (data));
        minCorner.add (data.boundingBox.minCorner, 'z', -100, 100).onChange (viewport.updateMinCornerZ)
                                                                  .onFinishChange (update (data));
        var maxCorner = boundingBox.addFolder ('maxCorner');
        maxCorner.open ();
        maxCorner.add (data.boundingBox.maxCorner, 'x', -100, 100).onChange (viewport.updateMaxCornerX)
                                                                  .onFinishChange (update (data));
        maxCorner.add (data.boundingBox.maxCorner, 'y', -100, 100).onChange (viewport.updateMaxCornerY)
                                                                  .onFinishChange (update (data));
        maxCorner.add (data.boundingBox.maxCorner, 'z', -100, 100).onChange (viewport.updateMaxCornerZ)
                                                                  .onFinishChange (update (data));
        datGui.add (data, 'nodeCount', 10, 100).onChange (viewport.updateNodeCount).onFinishChange (update (data));
        datGui.add (data, 'factor', 0.5, 1.0).onChange (viewport.updateFactor).onFinishChange (update (data));
        datGui.open ();
        viewport.init (data)
    });

    function update (data)
    {
        return function ()
        {
            $.ajax({url: 'neuron', type: 'POST', data: JSON.stringify (data), contentType: 'application/json'});
        };
    }
}

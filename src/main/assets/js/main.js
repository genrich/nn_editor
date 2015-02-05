function main ()
{
    "use strict";

    if (!Detector.webgl)
    {
        $('body').empty ();
        Detector.addGetWebGLMessage ();
        throw 'WebGL not supported';
    }

    var viewport = new ViewportA ($('#viewport'));

    $.getJSON ('neuron', function (data)
    {
        var datGui = new dat.GUI ();

        datGui.close ();
        datGui.add (data, 'name', ['neuron1']);

        var boundingBox = datGui.addFolder ('boundingBox');
        boundingBox.open ();

        var minCorner = boundingBox.addFolder ('minCorner');
        minCorner.open ();

        var minCornerX = minCorner.add (data.boundingBox.minCorner, 'x', -100, 100),
            minCornerY = minCorner.add (data.boundingBox.minCorner, 'y', -100, 100),
            minCornerZ = minCorner.add (data.boundingBox.minCorner, 'z', -100, 100);

        new PathObserver (data, 'boundingBox.minCorner.x').open ( function () { minCornerX.updateDisplay (); });
        new PathObserver (data, 'boundingBox.minCorner.y').open ( function () { minCornerY.updateDisplay (); });
        new PathObserver (data, 'boundingBox.minCorner.z').open ( function () { minCornerZ.updateDisplay (); });

        var maxCorner = boundingBox.addFolder ('maxCorner');
        maxCorner.open ();

        var maxCornerX = maxCorner.add (data.boundingBox.maxCorner, 'x', -100, 100),
            maxCornerY = maxCorner.add (data.boundingBox.maxCorner, 'y', -100, 100),
            maxCornerZ = maxCorner.add (data.boundingBox.maxCorner, 'z', -100, 100);

        new PathObserver (data, 'boundingBox.maxCorner.x').open ( function () { maxCornerX.updateDisplay (); });
        new PathObserver (data, 'boundingBox.maxCorner.y').open ( function () { maxCornerY.updateDisplay (); });
        new PathObserver (data, 'boundingBox.maxCorner.z').open ( function () { maxCornerZ.updateDisplay (); });

        datGui.add (data, 'nodeCount', 10, 100).onChange (viewport.updateNodeCount);
        datGui.add (data, 'factor', 0.5, 1.0).onChange (viewport.updateFactor);
        datGui.open ();
        viewport.init (data);
    });

    function update (data)
    {
        return function ()
        {
            $.ajax({url: 'neuron', type: 'POST', data: JSON.stringify (data), contentType: 'application/json'});
        };
    }
}

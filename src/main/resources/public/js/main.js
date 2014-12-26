function main ()
{
    if (!Detector.webgl)
    {
        $('body').empty ();
        Detector.addGetWebGLMessage ();
        throw 'WebGL not supported';
    }

    new Viewport ($('#viewport'));

    var gui = new dat.GUI ();
}

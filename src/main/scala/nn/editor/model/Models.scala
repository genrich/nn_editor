package nn.editor.model

class Point(val x:Double, val y:Double, val z:Double)

class Box(val minCorner:Point, val maxCorner:Point)

class Neuron(val boundingBox: Box, val nodeCount:Int)

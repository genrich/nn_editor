package nn.editor.action

import xitrum.annotation.Swagger
import xitrum.annotation.GET
import xitrum.Action
import nn.editor.model.Neuron
import nn.editor.model.Box
import nn.editor.model.Point

@GET("/")
class Index extends Action {
  def execute() {
    respondView()
  }
}

@GET("neuron")
@Swagger(
  Swagger.Resource("neuron", "APIs to edit neuron configuration"),
  Swagger.Note("Bounding box should be in [-100; 100]"),
  Swagger.Produces("application/json"),
  Swagger.Response(200, "Neuron configuration"),
  Swagger.Summary("Neuron generative model configurator")
)
class NeuronApi extends Action {
  def execute {
    val neuron = new Neuron(
      boundingBox = new Box(
        minCorner = new Point(0, 0, 0),
        maxCorner = new Point(10, 10, 10)),
      nodeCount = 10)
    
    respondJson(neuron)
  }
}

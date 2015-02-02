package nn.editor.action

import xitrum.Action
import xitrum.annotation.GET

@GET("/")
class Viewport extends Action {
  def execute() {
    respondView()
  }
}

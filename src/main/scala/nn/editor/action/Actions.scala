package nn.editor.action

import xitrum.annotation.{Swagger, GET, POST}
import xitrum.{Action, SkipCsrfCheck}
import nn.editor.model.{Neuron, Box, Point, NeuronDAO}
import scala.slick.driver.PostgresDriver.simple._
import java.net.URI
import scala.slick.driver.PostgresDriver
import Database.dynamicSession
import io.netty.handler.codec.http.HttpMethod
import xitrum.validator.Range

object Bounds {
  val lower = -100.0
  val upper =  100.0
}

@GET("")
class Index extends Action {
  def execute() {
    respondView()
  }
}

@GET("neuron")
@POST("neuron")
@Swagger(
  Swagger.Resource("neuron", "APIs to edit neuron configuration"),
  Swagger.Note("Bounding box should be in [-100; 100]"),
  Swagger.Produces("application/json"),
  Swagger.Response(200, "Neuron configuration"),
  Swagger.Summary("Neuron generative model configurator")
)
class NeuronApi extends Action with SkipCsrfCheck {
  val dbUri    = new URI(System.getenv("DATABASE_URL"))
  val username = dbUri.getUserInfo.split(":")(0)
  val password = dbUri.getUserInfo.split(":")(1)
  val dbUrl    = s"jdbc:postgresql://${dbUri.getHost}${dbUri.getPath}?ssl=true&sslfactory=org.postgresql.ssl.NonValidatingFactory"

  val db  = Database.forURL(dbUrl, username, password, driver = "org.postgresql.Driver")
  val dao = new NeuronDAO(PostgresDriver)

  def execute {
    if (request.getMethod == HttpMethod.POST) {
      requestContentJson[Neuron] match {
        case Some(neuron @ Neuron(id, _, Box(Point(x1, y1, z1), Point(x2, y2, z2)), nodeCount)) =>

          Range(Bounds.lower, Bounds.upper).exception("minCorner.x", x1)
          Range(Bounds.lower, Bounds.upper).exception("minCorner.y", y1)
          Range(Bounds.lower, Bounds.upper).exception("minCorner.y", z1)

          Range(Bounds.lower, Bounds.upper).exception("maxCorner.x", x2)
          Range(Bounds.lower, Bounds.upper).exception("maxCorner.y", y2)
          Range(Bounds.lower, Bounds.upper).exception("maxCorner.z", z2)

          Range(10, 100).exception("nodeCount", nodeCount)

          db.withDynSession {
            (for (n <- dao.neurons if n.id === id) yield n).update (neuron)
          }
        case _ =>
      }
      respondText("")
    } else {
      db.withDynSession {
        respondJson(dao.neurons.first)
      }
    }
  }
}

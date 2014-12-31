package nn.editor.model

import scala.slick.driver.H2Driver
import scala.slick.driver.H2Driver.simple.Database
import scala.slick.driver.H2Driver.simple.Session

import org.scalatest.BeforeAndAfter
import org.scalatest.Finders
import org.scalatest.FlatSpec
import org.scalatest.Matchers

class ModelsSpec extends FlatSpec with Matchers with BeforeAndAfter {

  implicit var session: Session = _
  implicit var dao = new NeuronDAO(H2Driver)

  before {
    session = Database.forURL("jdbc:h2:mem:test", driver = "org.h2.Driver").createSession
    dao.create
  }

  "Database" should "be ok for insert" in {
    val neuron = new Neuron(
      None,
      "neuron1",
      boundingBox = new Box(
        minCorner = new Point(0, 0, 0),
        maxCorner = new Point(10, 10, 10)),
      nodeCount = 10)
    val recordsInserted = dao += neuron
    assert(recordsInserted == 1)
  }

  after {
    session.close()
  }
}

package nn.editor.model

import scala.slick.driver.H2Driver
import scala.slick.driver.H2Driver.simple._
import org.scalatest.BeforeAndAfter
import org.scalatest.Finders
import org.scalatest.FlatSpec
import org.scalatest.Matchers
import org.scalatest.BeforeAndAfterAll

class ModelsSpec extends FlatSpec with Matchers with BeforeAndAfterAll {

  implicit var session: Session = _
  implicit var dao = new NeuronDAO(H2Driver)

  override def beforeAll {
    session = Database.forURL("jdbc:h2:mem:test", driver = "org.h2.Driver").createSession
    dao.create
  }

  "Database" should "insert" in {
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

  it should "read" in {
    dao.neurons.size.run shouldBe 1
    val n = dao.neurons.first
    n.id   shouldBe Some(1)
    n.name shouldBe "neuron1"
    n.boundingBox.minCorner.x shouldBe 0
    n.boundingBox.maxCorner.x shouldBe 10
  }

  it should "update name" in {
    val q = for (n <- dao.neurons if n.id === 1) yield n.name
    q.update("a")
    dao.neurons.first.name shouldBe "a"
  }

  it should "update bounding box" in {
    val q = for (n <- dao.neurons if n.id === 1) yield n.boundingBox
    q.update(Box(Point(-10, -10, -10), Point(0, 0, 0)))
    (for (n <- dao.neurons) yield (n.minCorner, n.maxCorner)).first shouldBe (Point(-10, -10, -10), Point(0, 0, 0))
  }

  override def afterAll {
    session.close()
  }
}

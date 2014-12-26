package nn.editor.model

import scala.slick.driver.H2Driver.simple.Database
import scala.slick.driver.H2Driver.simple.Session

import org.scalatest.BeforeAndAfter
import org.scalatest.FlatSpec
import org.scalatest.Matchers

class ModelsSpec extends FlatSpec with Matchers with BeforeAndAfter {

  implicit var session: Session = _

  before {
    session = Database.forURL("jdbc:hsqldb:mem:test", driver = "org.hsqldb.jdbcDriver").createSession()
  }

  "Test" should "be ok" in {
    assert(true)
  }

  after {
    session.close()
  }
}

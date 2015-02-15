package nn.editor.model

import slick.driver.PostgresDriver
import com.github.tminglei.slickpg._
import org.json4s.JValue

trait Postgres94Driver extends PostgresDriver with PgJson4sSupport {
  type DOCType = JValue
  override val pgjson      = "jsonb"
  override val jsonMethods = org.json4s.jackson.JsonMethods

  override lazy val Implicit = new ImplicitsPlus {}
  override      val simple   = new SimpleQLPlus  {}

  trait ImplicitsPlus extends Implicits with JsonImplicits

  trait SimpleQLPlus extends SimpleQL with ImplicitsPlus
}

object Postgres94Driver extends Postgres94Driver

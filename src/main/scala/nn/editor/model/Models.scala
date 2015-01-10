package nn.editor.model

import java.io.File
import java.io.PrintWriter
import scala.slick.driver.JdbcProfile
import scala.slick.driver.PostgresDriver

case class Point(val x: Double, val y: Double, val z: Double)

case class Box(val minCorner: Point, val maxCorner: Point)

case class Neuron(val id: Option[Int], val name: String, val boundingBox: Box, val nodeCount: Int, val factor: Double)

class NeuronDAO(val driver: JdbcProfile) {
  import driver.simple._

  class Neurons(tag: Tag) extends Table[Neuron](tag, "NEURONS") {
    def id         = column[Int]   ("ID", O.PrimaryKey, O.AutoInc)
    def name       = column[String]("NAME")
    def minCornerX = column[Double]("MIN_CORNER_X")
    def minCornerY = column[Double]("MIN_CORNER_Y")
    def minCornerZ = column[Double]("MIN_CORNER_Z")
    def maxCornerX = column[Double]("MAX_CORNER_X")
    def maxCornerY = column[Double]("MAX_CORNER_Y")
    def maxCornerZ = column[Double]("MAX_CORNER_Z")
    def nodeCount  = column[Int]   ("NODE_COUNT")
    def factor     = column[Double]("FACTOR")

    def *           = (id.?, name, boundingBox, nodeCount, factor) <> (Neuron.tupled, Neuron.unapply)
    def boundingBox = (minCorner, maxCorner)                       <> (Box.tupled, Box.unapply)
    def minCorner   = (minCornerX, minCornerY, minCornerZ)         <> (Point.tupled, Point.unapply)
    def maxCorner   = (maxCornerX, maxCornerY, maxCornerZ)         <> (Point.tupled, Point.unapply)
  }

  val neurons = TableQuery[Neurons]

  val ddl = neurons.ddl

  def create(implicit session: Session) = neurons.ddl.create

  def += (value: Neuron)(implicit session: Session) = neurons += value
}

object DDLS {
  def main(args: Array[String]) {
    val file = new File(args(0))
    new File(file.getParent).mkdirs
    val contents = new NeuronDAO(PostgresDriver).ddl.createStatements.mkString(";\n")
    val writer   = new PrintWriter(file)
    writer write contents
    writer.close
  }
}

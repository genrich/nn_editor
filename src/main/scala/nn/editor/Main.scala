package nn.editor

import util.Properties
import xitrum.Server
import java.net.URLClassLoader
import java.net.URI

object Main {
  def main(args: Array[String]) {
    val port = Properties.envOrElse("PORT", "8000")

    // val dbUri = new URI(System.getenv("DATABASE_URL"))
    // val username = dbUri.getUserInfo.split(":")(0)
    // val password = dbUri.getUserInfo.split(":")(1)
    // val dbUrl = "jdbc:postgresql://" + dbUri.getHost + dbUri.getPath

    System.setProperty("xitrum.port.http", port)
    Server.start
  }
}

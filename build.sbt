import NativePackagerKeys._
import NativePackagerHelper._

packageArchetype.java_application

name := "nn_editor"

version := "1.0-SNAPSHOT"

scalaVersion := "2.11.4"

libraryDependencies := Seq(
  "org.postgresql"     %  "postgresql"      % "9.3-1102-jdbc41" % "runtime",
  "com.typesafe.slick" %% "slick"           % "2.1.0",
  "org.hsqldb"         %  "hsqldb"          % "2.3.2"           % "test",
  "tv.cntt"            %% "xitrum"          % "3.21",
  "ch.qos.logback"     %  "logback-classic" % "1.1.2",
  "org.scalatest"      %% "scalatest"       % "2.2.1"           % "test"
)

mappings in Universal ++= contentOf("src/main/resources")

scriptClasspath += "../config"

test <<= test in Test mapR {
  case Inc(inc: Incomplete) =>
     print("\u0007")
     throw inc
  case Value(v) =>
     v
}

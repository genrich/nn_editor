packageArchetype.java_application

name := "nn_editor"

version := "1.0-SNAPSHOT"

scalaVersion := "2.11.4"

libraryDependencies := Seq(
  "com.twitter"    %% "finagle-http" % "6.24.1-MONOCACHE",
  "org.postgresql" %  "postgresql"   % "9.3-1102-jdbc41"
)

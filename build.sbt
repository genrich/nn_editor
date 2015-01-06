import NativePackagerKeys._

val ddls = taskKey[Unit]("DDL statements for prod")
ddls := {
  (compile in Compile).value
  val src = sourceDirectory.value
  val cp  = (fullClasspath in Runtime).value.files
  val r   = (runner in Compile).value
  val s   = streams.value
  toError(r.run("nn.editor.model.DDLS", cp, Array(s"${src}/main/sql/ddls.sql"), s.log))
}

lazy val nn_editor = (project in file(".")).
  settings(packageArchetype.java_application: _*).
  settings(
    name                   := "nn_editor",
    version                := "1.0-SNAPSHOT",
    scalaVersion           := "2.11.4",
    autoScalaLibrary       := false,
    mainClass in Compile   := Some("nn.editor.Main"),
    EclipseKeys.withSource := true,
    libraryDependencies    := Seq(
      "org.postgresql"     %  "postgresql"      % "9.3-1102-jdbc41" % Runtime,
      "com.typesafe.slick" %% "slick"           % "2.1.0",
      "com.h2database"     %  "h2"              % "1.4.184"         % Test,
      "tv.cntt"            %% "xitrum"          % "3.21",
      "ch.qos.logback"     %  "logback-classic" % "1.1.2",
      "org.scalatest"      %% "scalatest"       % "2.2.1"           % Test),
    watchSources ++= ((baseDirectory.value / "src" / "universal") ** ("*.conf" || "*.xml" || "*.js" || "*.css")).get,
    scriptClasspath += "../config",
    test <<= test in Test mapR {
      case Inc(inc: Incomplete) =>
        print("\u0007")
        throw inc
      case Value(v) =>
        v })

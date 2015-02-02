val ddls = taskKey[Unit]("DDL statements for prod")
ddls := {
  (compile in Compile).value
  val src = sourceDirectory.value
  val cp  = (fullClasspath in Runtime).value.files
  val r   = (runner in Compile).value
  val s   = streams.value
  toError(r.run("nn.editor.model.DDLS", cp, Array(s"${src}/main/sql/ddls.sql"), s.log))
}

def assetFilter(dir:String, excludeSuffix:String, ends:String) = new SimpleFileFilter({f =>
    f.getPath.startsWith(dir) && !HiddenFileFilter.accept(f) && f.isFile &&
    !f.getName.endsWith(excludeSuffix) && f.getName.endsWith(ends)})

lazy val nn_editor = (project in file(".")).

  enablePlugins(JavaAppPackaging, SbtWeb).

  settings(
    name                   := "nn_editor",
    version                := "1.0-SNAPSHOT",
    scalaVersion           := "2.11.5",
    autoScalaLibrary       := false,

    mainClass in Compile   := Some("nn.editor.Main"),

    scriptClasspath        += "../config",

    EclipseKeys.withSource := true,

    libraryDependencies    := Seq(
      "org.postgresql"     %  "postgresql"      % "9.3-1102-jdbc41" % Runtime,
      "com.typesafe.slick" %% "slick"           % "2.1.0",
      "tv.cntt"            %% "xitrum"          % "3.22",
      "tv.cntt"            %% "xitrum-scalate"  % "2.3",
      "ch.qos.logback"     %  "logback-classic" % "1.1.2",
      "com.h2database"     %  "h2"              % "1.4.184"         % Test,
      "org.scalatest"      %% "scalatest"       % "2.2.1"           % Test,
      "org.webjars"        %  "mousetrap"       % "1.4.6",
      "org.webjars"        %  "notifyjs"        % "0.3.2",
      "org.webjars"        %  "dat-gui"         % "0.5.0",
      "org.webjars"        %  "font-awesome"    % "4.3.0-1",
      "org.webjars"        %  "bootstrap"       % "3.3.2"
    ),

    pipelineStages := Seq(cssCompress, uglify),

    includeFilter in uglify      := assetFilter(((sourceDirectory in Assets).value / "js")    .getPath, "min.js",                 ".js"),
    includeFilter in cssCompress := assetFilter(((sourceDirectory in Assets).value / "styles").getPath, CssCompress.suffix.value, ".css"),

    mappings in Universal <++= WebKeys.stage map { stageDir =>
      val js  = stageDir / "js"     ** ("*.js" || "*.map")
      val css = stageDir / "styles" ** ("*.css")
      (js pair rebase(stageDir, "public")) ++ (css pair rebase(stageDir, "public"))
    },

    watchSources ++= ((baseDirectory.value / "src" / "universal") ** ("*.conf" || "*.xml" || "*.js" || "*.css")).get,

    test <<= test in Test mapR {
      case Inc(inc: Incomplete) =>
        print("\u0007")
        throw inc
      case Value(v) =>
        v }).

  settings(scalateSettings: _*).
  settings(ScalateKeys.scalateTemplateConfig in Compile := Seq(TemplateConfig(
      baseDirectory.value / "src" / "main" / "scalate",
      Seq(),
      Seq(Binding("helper", "xitrum.Action", true)))))

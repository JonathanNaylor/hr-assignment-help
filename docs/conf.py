"""Sphinx configuration for the HR Assignment Help documentation."""

project = "HR Assignment Help"
author = "Academic Help Services"
copyright = "2026, Academic Help Services"

extensions = ["myst_parser"]

source_suffix = {
    ".md": "markdown",
    ".rst": "restructuredtext",
}
master_doc = "index"

myst_heading_anchors = 3

exclude_patterns = ["_build", "Thumbs.db", ".DS_Store"]

html_theme = "sphinx_rtd_theme"
html_title = "HR Assignment Help"

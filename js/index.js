skills = [
    {
        title: "Certifications",
        skills: [
            ["CompTIA Security+, Pentest+, CySA+ and CASP+", 5],
            ["AWS", 5],
            ["Distritbuted Systems", 5],
            ["BlockChain", 5],
        ]
    },
    {
        title: "Programming Languages",
        skills: [
            ["C/C++", 5],
            ["RUST", 3],
            ["Python", 5],
            ["Java SpringBoot", 2],
        ]
    },
    {
        title: "Frameworks",
        skills: [
            ["Kubernetes", 2],
            ["Linux", 3],
            ["Kafka", 3],
            ["LaTeX", 3],
            ["Git", 4]
        ]
    },
    {
        title: "Web Development",
        skills: [
            ["Javascript", 4],
            ["ReactJS", 4],
            ["MySQL", 4],
            ["CSS/HTML", 4],
            ["Node.js", 3]
        ]
    },
    // {
    //     title: "Miscellaneous",
    //     skills: [
    //         ["LaTeX", 3],
    //         ["Git", 4]
    //     ]
    // }
]

$(document).ready(function () {
    $("span.link").on("click", function () {
        var goto = $(this).data("goto");

        var elem = $("#" + goto);
        console.log($(document).scroll);
        window.scroll({
            top: elem.offset().top - 80,
            left: 0,
            behavior: "smooth"
        });
    });

    var skills_block = document.querySelector("#skills");

    for (var index in skills) {
        var skills_group = skills[index];
        var html = `<div class="skill-title">` + skills_group.title + `</div>`

        for (var skill_index in skills_group.skills) {
            var skill = skills_group.skills[skill_index]

            html += `<div class="skill">
                ` + skill[0] + `
                <div class="skill-rate rate-` + skill[1] + `">
                    <div></div>
                    </div>
                </div>
            `
        }

        skills_block.innerHTML += `<div class="skill-group">` + html + `</div>`
    }
});